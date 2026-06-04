import Foundation
import Vision
import AppKit

if CommandLine.arguments.count < 2 {
  fputs("Usage: swift ocr-image.swift <image> [image...]\n", stderr)
  exit(1)
}

func recognize(_ path: String) throws -> String {
  let imageURL = URL(fileURLWithPath: path)
  guard let image = NSImage(contentsOf: imageURL),
        let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    throw NSError(domain: "OCR", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not load image: \(imageURL.path)"])
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["zh-Hans", "en-US"]

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  try handler.perform([request])
  return (request.results ?? [])
    .compactMap { $0.topCandidates(1).first?.string }
    .joined(separator: "\n")
}

do {
  var pages: [String] = []
  for path in CommandLine.arguments.dropFirst() {
    pages.append(try recognize(path))
  }
  print(pages.joined(separator: "\n\u{000C}\n"))
} catch {
  fputs("OCR failed: \(error.localizedDescription)\n", stderr)
  exit(1)
}
