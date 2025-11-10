"use client";
import { useRef, useState, useEffect } from "react";

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  // ⏳ Tự động tắt camera sau 30 giây nếu không chụp
  useEffect(() => {
    let timeout;
    if (stream) {
      timeout = setTimeout(() => {
        stopCamera();
        alert(
          "⚠️ Camera đã tự động tắt vì không có thao tác chụp sau 30 giây."
        );
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [stream]);

  const startCamera = async () => {
    try {
      // 🧠 Kiểm tra nếu là thiết bị mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // ⚙️ Kiểm tra quyền camera
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({
          name: "camera",
        });
        if (permissionStatus.state === "denied") {
          alert(
            "⚠️ Quyền truy cập máy ảnh đã bị chặn!\n\n" +
              "Hãy vào Cài đặt trình duyệt → Quyền (Permissions) → Cho phép truy cập camera, sau đó tải lại trang."
          );
          return;
        }
      }

      // 🎥 Nếu là mobile, ưu tiên camera sau (environment)
      const constraints = {
        video: isMobile
          ? { facingMode: { ideal: "environment" } }
          : { facingMode: "user" },
      };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = s;
      setStream(s);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        alert(
          "⚠️ Bạn đã từ chối quyền truy cập camera.\n\nHãy bật lại quyền trong Cài đặt trình duyệt và tải lại trang."
        );
      } else if (err.name === "NotFoundError") {
        alert("🚫 Không tìm thấy camera trên thiết bị của bạn!");
      } else {
        alert("❌ Không thể bật camera: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setStream(null);
    }
  };

  const capture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stopCamera(); // ✅ Tắt camera sau khi chụp
      }
    }, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md aspect-[3/4] object-cover rounded-xl border shadow-md bg-black"
      />

      {!stream && (
        <a
          onClick={startCamera}
          className="bg-accent shadow-accent-volume hover:bg-accent-dark inline-block rounded-full py-3 px-8 text-center font-semibold text-white transition-all cursor-pointer"
        >
          🎥 Check in
        </a>
      )}

      {stream && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <button
              onClick={capture}
              className="bg-accent shadow-accent-volume hover:bg-accent-dark rounded-full py-2 px-6 text-center font-semibold text-white transition-all"
            >
              📸 Capture
            </button>
            <button
              type="button"
              className="text-accent font-display text-sm font-semibold"
              onClick={stopCamera}
            >
              ✖ Hủy check-in
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Nếu bạn không muốn chụp nữa, bấm “Hủy check-in” để tắt camera.
          </p>
        </div>
      )}
    </div>
  );
}
