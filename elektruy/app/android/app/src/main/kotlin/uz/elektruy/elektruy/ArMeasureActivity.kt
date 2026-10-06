package uz.elektruy.elektruy

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.google.ar.core.Anchor
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Pose
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.UnavailableException
import java.util.Locale
import java.util.concurrent.ArrayBlockingQueue
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.sqrt

/**
 * Minimal ARCore tape measure: camera background, tap two points on detected
 * surfaces, see the straight-line distance, press "Use". Texts come from Flutter
 * so they follow the app language.
 */
class ArMeasureActivity : Activity(), GLSurfaceView.Renderer {
    private lateinit var surface: GLSurfaceView
    private lateinit var hint: TextView
    private lateinit var useButton: Button
    private val texts = HashMap<String, String>()

    private var session: Session? = null
    private var installRequested = false
    private val background = BackgroundRenderer()
    private val marks = MarkRenderer()

    private val taps = ArrayBlockingQueue<MotionEvent>(4)
    private val anchors = ArrayList<Anchor>() // GL thread only
    private var viewportChanged = false
    private var viewportWidth = 0
    private var viewportHeight = 0

    @Volatile private var distance: Double? = null
    private var lastHint = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        for (key in TEXT_KEYS) texts[key] = intent.getStringExtra(key) ?: ""

        surface = GLSurfaceView(this).apply {
            preserveEGLContextOnPause = true
            setEGLContextClientVersion(2)
            setEGLConfigChooser(8, 8, 8, 8, 16, 0)
            setRenderer(this@ArMeasureActivity)
            renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
            setWillNotDraw(false)
            setOnTouchListener { v, e ->
                if (e.action == MotionEvent.ACTION_UP) {
                    taps.offer(MotionEvent.obtain(e))
                    v.performClick()
                }
                true
            }
        }
        hint = TextView(this).apply {
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.argb(170, 0, 0, 0))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setPadding(dp(16), dp(14), dp(16), dp(14))
            gravity = Gravity.CENTER
            text = texts["scanHint"]
        }
        val reset = Button(this).apply {
            text = texts["reset"]
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setOnClickListener {
                surface.queueEvent {
                    anchors.forEach { it.detach() }
                    anchors.clear()
                    distance = null
                }
            }
        }
        useButton = Button(this).apply {
            text = texts["use"]
            isEnabled = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setOnClickListener {
                val d = distance ?: return@setOnClickListener
                setResult(RESULT_OK, Intent().putExtra(EXTRA_DISTANCE, d))
                finish()
            }
        }
        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(12), dp(12), dp(12), dp(24))
            addView(reset, LinearLayout.LayoutParams(0, dp(64), 1f))
            addView(useButton, LinearLayout.LayoutParams(0, dp(64), 2f))
        }
        val root = FrameLayout(this)
        root.addView(surface, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        root.addView(hint, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP))
        root.addView(buttons, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM))
        setContentView(root)
    }

    override fun onResume() {
        super.onResume()
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA)
            return
        }
        if (session == null) {
            try {
                if (ArCoreApk.getInstance().requestInstall(this, !installRequested) == ArCoreApk.InstallStatus.INSTALL_REQUESTED) {
                    installRequested = true
                    return
                }
                val s = Session(this)
                val config = Config(s).apply {
                    planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                    focusMode = Config.FocusMode.AUTO
                    updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
                    if (s.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) depthMode = Config.DepthMode.AUTOMATIC
                }
                s.configure(config)
                session = s
            } catch (e: UnavailableException) {
                cancel()
                return
            } catch (e: SecurityException) {
                cancel()
                return
            }
        }
        try {
            session?.resume()
        } catch (e: CameraNotAvailableException) {
            session = null
            cancel()
            return
        }
        surface.onResume()
    }

    override fun onPause() {
        super.onPause()
        surface.onPause()
        session?.pause()
    }

    override fun onDestroy() {
        session?.close()
        session = null
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CAMERA && (grantResults.isEmpty() || grantResults[0] != PackageManager.PERMISSION_GRANTED)) cancel()
    }

    private fun cancel() {
        setResult(RESULT_CANCELED)
        finish()
    }

    // ------------------------------------------------------------------ GL thread

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0f, 0f, 0f, 1f)
        background.create()
        marks.create()
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        GLES20.glViewport(0, 0, width, height)
        viewportWidth = width
        viewportHeight = height
        viewportChanged = true
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
        val s = session ?: return
        if (viewportChanged) {
            s.setDisplayGeometry(displayRotation(), viewportWidth, viewportHeight)
            viewportChanged = false
        }
        s.setCameraTextureName(background.textureId)
        val frame: Frame = try {
            s.update()
        } catch (e: Exception) {
            return
        }
        background.draw(frame)
        val camera = frame.camera
        if (camera.trackingState != TrackingState.TRACKING) {
            showHint(texts["scanHint"] ?: "")
            return
        }
        handleTap(frame)

        val projection = FloatArray(16)
        val view = FloatArray(16)
        camera.getProjectionMatrix(projection, 0, 0.05f, 50f)
        camera.getViewMatrix(view, 0)
        val poses = anchors.filter { it.trackingState == TrackingState.TRACKING }.map { it.pose }
        marks.draw(poses, view, projection)

        if (poses.size == 2) {
            val d = between(poses[0], poses[1])
            distance = d
            showHint(String.format(Locale.US, "%.2f m", d))
        } else {
            distance = null
            val surfaceFound = s.getAllTrackables(Plane::class.java).any { it.trackingState == TrackingState.TRACKING }
            showHint(
                when {
                    !surfaceFound && anchors.isEmpty() -> texts["scanHint"] ?: ""
                    anchors.isEmpty() -> texts["tapFirst"] ?: ""
                    else -> texts["tapSecond"] ?: ""
                }
            )
        }
    }

    private fun handleTap(frame: Frame) {
        val tap = taps.poll() ?: return
        try {
            for (hit in frame.hitTest(tap)) {
                val t = hit.trackable
                val usable = (t is Plane && t.isPoseInPolygon(hit.hitPose)) ||
                    (t is Point && t.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL) ||
                    t is DepthPoint
                if (!usable) continue
                if (anchors.size >= 2) {
                    anchors.forEach { it.detach() }
                    anchors.clear()
                }
                anchors.add(hit.createAnchor())
                break
            }
        } finally {
            tap.recycle()
        }
    }

    private fun between(a: Pose, b: Pose): Double {
        val dx = (a.tx() - b.tx()).toDouble()
        val dy = (a.ty() - b.ty()).toDouble()
        val dz = (a.tz() - b.tz()).toDouble()
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    private fun showHint(text: String) {
        val label = distance?.let { String.format(Locale.US, "%s (%.2f m)", texts["use"], it) } ?: (texts["use"] ?: "")
        val key = text + "|" + label
        if (key == lastHint) return
        lastHint = key
        runOnUiThread {
            hint.text = text
            useButton.text = label
            useButton.isEnabled = distance != null
        }
    }

    private fun displayRotation(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            display?.rotation ?: 0
        } else {
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.rotation
        }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    companion object {
        const val EXTRA_DISTANCE = "distance"
        val TEXT_KEYS = listOf("scanHint", "tapFirst", "tapSecond", "use", "reset")
        private const val REQUEST_CAMERA = 11
    }
}
