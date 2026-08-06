// File: mobile/lib/custom_code/widgets/ocr_camera_scanner_widget.dart
// Komponen Widget Flutter / FlutterFlow untuk Scanning Text (SN, MID, TID, No Surat) via Kamera dengan ROI Box

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrCameraScannerWidget extends StatefulWidget {
  const OcrCameraScannerWidget({
    super.key,
    this.width,
    this.height,
    required this.targetFieldName,
    required this.onTextScanned,
  });

  final double? width;
  final double? height;
  final String targetFieldName; // Contoh: 'SN', 'MID', 'TID', 'No Surat'
  final Function(String scannedText) onTextScanned;

  @override
  State<OcrCameraScannerWidget> createState() => _OcrCameraScannerWidgetState();
}

class _OcrCameraScannerWidgetState extends State<OcrCameraScannerWidget> {
  CameraController? _cameraController;
  final TextRecognizer _textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
  bool _isProcessing = false;
  String _detectedText = "";
  List<CameraDescription> _cameras = [];
  List<Map<String, dynamic>> _detectedLines = [];

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isNotEmpty) {
        _cameraController = CameraController(
          _cameras.first,
          ResolutionPreset.high,
          enableAudio: false,
        );
        await _cameraController!.initialize();
        if (!mounted) return;
        _cameraController!.startImageStream(_processCameraImage);
        setState(() {});
      }
    } catch (e) {
      debugPrint("Camera initialization error: $e");
    }
  }

  void _processCameraImage(CameraImage image) async {
    if (_isProcessing || !mounted) return;

    // Ambil ukuran layar (screen space) secara aman sebelum proses asinkronus
    final Size screenSize = MediaQuery.of(context).size;

    _isProcessing = true;

    try {
      final WriteBuffer allBytes = WriteBuffer();
      for (final Plane plane in image.planes) {
        allBytes.putUint8List(plane.bytes);
      }
      final bytes = allBytes.done().buffer.asUint8List();

      final Size imageSize = Size(image.width.toDouble(), image.height.toDouble());
      final InputImageRotation imageRotation =
          InputImageRotationValue.fromRawValue(_cameras.first.sensorOrientation) ??
              InputImageRotation.rotation0deg;
      final InputImageFormat inputImageFormat =
          InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;

      final inputImage = InputImage.fromBytes(
        bytes: bytes,
        metadata: InputImageMetadata(
          size: imageSize,
          rotation: imageRotation,
          format: inputImageFormat,
          bytesPerRow: image.planes[0].bytesPerRow,
        ),
      );

      final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);

      // Hitung koordinat kotak neon ROI (Lebih kecil & terfokus pada satu baris teks)
      final double rectWidth = screenSize.width * 0.75;
      const double rectHeight = 50.0;
      final double rectLeft = (screenSize.width - rectWidth) / 2;
      final double rectTop = (screenSize.height - rectHeight) / 2 - 30;
      final Rect roiRect = Rect.fromLTWH(rectLeft, rectTop, rectWidth, rectHeight);

      String capturedInRoi = "";
      final List<Map<String, dynamic>> tempLines = [];

      for (TextBlock block in recognizedText.blocks) {
        for (TextLine line in block.lines) {
          final Rect rect = line.boundingBox;

          // Hitung rasio aspek BoxFit.cover antara kamera preview dan layar
          final double imageWidth = imageRotation == InputImageRotation.rotation90deg ||
                  imageRotation == InputImageRotation.rotation270deg
              ? imageSize.height
              : imageSize.width;
          final double imageHeight = imageRotation == InputImageRotation.rotation90deg ||
                  imageRotation == InputImageRotation.rotation270deg
              ? imageSize.width
              : imageSize.height;

          final double screenWidth = screenSize.width;
          final double screenHeight = screenSize.height;

          // Skala perbesaran BoxFit.cover
          final double scale = (screenWidth / imageWidth > screenHeight / imageHeight)
              ? screenWidth / imageWidth
              : screenHeight / imageHeight;

          final double scaledWidth = imageWidth * scale;
          final double scaledHeight = imageHeight * scale;

          // Pemotongan horizontal/vertikal (offset centering)
          final double dx = (scaledWidth - screenWidth) / 2;
          final double dy = (scaledHeight - screenHeight) / 2;


          // ML Kit mengembalikan boundingBox yang sudah dirotasi sesuai metadata.
          // Jadi kita hanya perlu melakukan scaling dan centering offset (dx, dy).
          final double screenLeft = (rect.left * scale) - dx;
          final double screenTop = (rect.top * scale) - dy;
          final double screenRight = screenLeft + (rect.width * scale);
          final double screenBottom = screenTop + (rect.height * scale);

          final Rect textScreenRect = Rect.fromLTRB(screenLeft, screenTop, screenRight, screenBottom);
          final Offset center = textScreenRect.center;

          // Filter ketat: Titik tengah teks harus berada di dalam batas vertikal & horizontal kotak neon
          final bool inRoi = center.dy >= roiRect.top &&
              center.dy <= roiRect.bottom &&
              center.dx >= roiRect.left &&
              center.dx <= roiRect.right;

          tempLines.add({
            'text': line.text,
            'rect': textScreenRect,
            'inRoi': inRoi,
          });

          if (inRoi) {
            capturedInRoi += "${line.text} ";
          }
        }
      }

      capturedInRoi = _cleanOcrText(capturedInRoi);

      setState(() {
        _detectedLines = tempLines;
        if (capturedInRoi.isNotEmpty && capturedInRoi != _detectedText) {
          _detectedText = capturedInRoi;
        }
      });
    } catch (e) {
      debugPrint("OCR Scanner Error: $e");
    } finally {
      _isProcessing = false;
    }
  }

  String _cleanOcrText(String text) {
    String cleaned = text.trim();
    // Hapus spasi acak di tengah kode
    cleaned = cleaned.replaceAll(' ', '');

    // Pola regex untuk mendeteksi prefix (seperti WPYB, MID, TID, dll.) diikuti badan alfanumerik
    // Contoh: WPYBOO26269263 -> WPYB + OO26269263
    final RegExp prefixRegex = RegExp(r'^([a-zA-Z]{3,5})([a-zA-Z0-9]+)$');
    final match = prefixRegex.firstMatch(cleaned);
    if (match != null) {
      final String prefix = match.group(1)!;
      String body = match.group(2)!;

      // Di dalam body kode/nomor seri, huruf O/o hampir pasti adalah angka 0
      body = body.replaceAll(RegExp(r'[Oo]'), '0');
      // Huruf I/i/l hampir pasti adalah angka 1
      body = body.replaceAll(RegExp(r'[Iil]'), '1');
      // Huruf S/s hampir pasti adalah angka 5
      body = body.replaceAll(RegExp(r'[Ss]'), '5');
      // Huruf Z/z hampir pasti adalah angka 2
      body = body.replaceAll(RegExp(r'[Zz]'), '2');

      cleaned = prefix.toUpperCase() + body;
    } else {
      // Jika tidak cocok pola prefix, lakukan penggantian umum pada karakter yang mirip angka jika ada angka di sekitarnya
      if (cleaned.contains(RegExp(r'[0-9]'))) {
        cleaned = cleaned.replaceAll('O', '0').replaceAll('o', '0');
      }
    }
    return cleaned;
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _textRecognizer.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          title: Text("Scan OCR ${widget.targetFieldName}"),
          backgroundColor: const Color(0xFF00569E),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: Color(0xFF00569E)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Preview Kamera Fullscreen
          Positioned.fill(
            child: CameraPreview(_cameraController!),
          ),

          // 2. Bounding Boxes Debug Overlay (Menunjukkan posisi teks yang dibaca model secara visual)
          Positioned.fill(
            child: CustomPaint(
              painter: DebugBoxPainter(_detectedLines),
            ),
          ),

          // 2. Custom Painter Overlay ROI (Area luar gelap, area tengah terang)
          Positioned.fill(
            child: CustomPaint(
              painter: RoiOverlayPainter(),
            ),
          ),

          // 3. Judul & Instruksi Petunjuk Penggunaan
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    "Scan ${widget.targetFieldName}",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Posisikan teks tepat di dalam kotak terang",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),

          // 4. Box Hasil Deteksi & Tombol Gunakan Teks Ini
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 10,
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Teks Terdeteksi (Dalam Kotak):",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _detectedText.isEmpty
                            ? "Arahkan kamera ke teks..."
                            : _detectedText,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: _detectedText.isEmpty
                              ? Colors.grey
                              : const Color(0xFF00569E),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade800,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () => Navigator.pop(context),
                        child: const Text("Batal", style: TextStyle(color: Colors.white)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00569E), // Biru Nagari
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: _detectedText.isEmpty
                            ? null
                            : () {
                                widget.onTextScanned(_detectedText);
                                Navigator.pop(context);
                              },
                        child: const Text(
                          "Salin ke Input",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Custom Painter untuk Menggelapkan Area Luar ROI & Menyorot Kotak ROI dengan Cyan Neon
class RoiOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double rectWidth = size.width * 0.75;
    const double rectHeight = 50.0;
    final double rectLeft = (size.width - rectWidth) / 2;
    final double rectTop = (size.height - rectHeight) / 2 - 30;

    final Rect roiRect = Rect.fromLTWH(rectLeft, rectTop, rectWidth, rectHeight);

    // 1. Overlay Gelap di Luar Box
    final Paint darkPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.68)
      ..style = PaintingStyle.fill;

    final Path backgroundPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final Path roiPath = Path()
      ..addRRect(RRect.fromRectAndRadius(roiRect, const Radius.circular(14)));

    final Path overlayPath = Path.combine(
      PathOperation.difference,
      backgroundPath,
      roiPath,
    );

    canvas.drawPath(overlayPath, darkPaint);

    // 2. Border Neon Cyan di Sekitar Box ROI
    final Paint borderPaint = Paint()
      ..color = const Color(0xFF00E5FF) // Cyan Neon
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    canvas.drawRRect(
      RRect.fromRectAndRadius(roiRect, const Radius.circular(14)),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Painter untuk menggambar garis tepi teks yang terdeteksi secara real-time
class DebugBoxPainter extends CustomPainter {
  final List<Map<String, dynamic>> lines;
  DebugBoxPainter(this.lines);

  @override
  void paint(Canvas canvas, Size size) {
    for (final line in lines) {
      final Rect rect = line['rect'] as Rect;
      final bool inRoi = line['inRoi'] as bool;

      // Warna hijau jika teks masuk dalam target kotak, warna putih transparan jika di luar
      final Paint paint = Paint()
        ..color = inRoi ? const Color(0xFF00FF66) : Colors.white.withValues(alpha: 0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = inRoi ? 2.5 : 1.0;

      canvas.drawRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant DebugBoxPainter oldDelegate) => true;
}
