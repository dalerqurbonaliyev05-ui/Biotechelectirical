package uz.elektruy.elektruy

import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.google.ar.core.ArCoreApk
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Hosts Flutter and the `elektruy/ar` channel:
 *  - `availability` -> "supported" | "not_installed" | "unsupported"
 *  - `measure` -> opens [ArMeasureActivity], returns the distance in metres or null.
 */
class MainActivity : FlutterActivity() {
    private var pending: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "availability" -> checkAvailability(result, 0)
                "measure" -> {
                    if (pending != null) {
                        result.error("busy", "A measurement is already open", null)
                    } else {
                        pending = result
                        val intent = Intent(this, ArMeasureActivity::class.java)
                        for (key in ArMeasureActivity.TEXT_KEYS) {
                            intent.putExtra(key, call.argument<String>(key) ?: "")
                        }
                        @Suppress("DEPRECATION")
                        startActivityForResult(intent, REQUEST_MEASURE)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    /** ARCore answers "checking" for a moment after start; poll briefly. */
    private fun checkAvailability(result: MethodChannel.Result, attempt: Int) {
        val availability = try {
            ArCoreApk.getInstance().checkAvailability(this)
        } catch (e: Exception) {
            result.success("unsupported")
            return
        }
        if (availability.isTransient && attempt < 15) {
            Handler(Looper.getMainLooper()).postDelayed({ checkAvailability(result, attempt + 1) }, 200)
            return
        }
        result.success(
            when {
                availability == ArCoreApk.Availability.SUPPORTED_INSTALLED -> "supported"
                availability.isSupported -> "not_installed"
                else -> "unsupported"
            }
        )
    }

    @Deprecated("Uses the platform activity result API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_MEASURE) return
        val result = pending ?: return
        pending = null
        if (resultCode == RESULT_OK && data != null && data.hasExtra(ArMeasureActivity.EXTRA_DISTANCE)) {
            result.success(data.getDoubleExtra(ArMeasureActivity.EXTRA_DISTANCE, 0.0))
        } else {
            result.success(null)
        }
    }

    companion object {
        private const val CHANNEL = "elektruy/ar"
        private const val REQUEST_MEASURE = 4711
    }
}
