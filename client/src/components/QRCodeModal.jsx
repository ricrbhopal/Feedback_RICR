import React from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";

const QRCodeModal = ({ isOpen, onClose, formLink, formTitle }) => {
  if (!isOpen) return null;

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${formTitle.replace(/\s+/g, "_")}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formLink);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">QR Code</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {formTitle}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code to access the form
            </p>
          </div>
          <div className="flex justify-center mb-6 bg-white p-4 rounded-lg border-2 border-gray-200">
            <QRCodeSVG
              id="qr-code-svg"
              value={formLink}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 break-all">{formLink}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadQR}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
            >
              Download QR Code
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 px-4 py-2 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
