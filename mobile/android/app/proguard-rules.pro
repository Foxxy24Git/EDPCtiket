# Flutter Secure Storage rules
-keep class com.it_ne.flutter_secure_storage.** { *; }
-dontwarn com.it_ne.flutter_secure_storage.**

# Google ML Kit Text Recognition rules
-dontwarn com.google.mlkit.vision.text.**
-keep class com.google.mlkit.vision.text.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
