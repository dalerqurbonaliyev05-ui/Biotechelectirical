# Release builds are shrunk by R8 (Flutter default).

# Flutter's deferred-components code references Play Core, which this app does not ship.
-dontwarn com.google.android.play.core.**

# ARCore's native library looks these classes up by name.
-keep class com.google.ar.core.** { *; }
-dontwarn com.google.ar.core.**
