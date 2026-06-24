import React, { useRef, useEffect } from "react";
import * as faceapi from "face-api.js";

const FaceDetectionPage = () => {
  const videoRef = useRef();

  useEffect(() => {
    const loadModels = async () => {
      // Carga los modelos desde public/models
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    };

    const startVideo = async () => {
      await loadModels();
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => (videoRef.current.srcObject = stream))
        .catch((err) => console.error("Error con la cámara:", err));
    };

    startVideo();
  }, []);

  const handleVideoPlay = () => {
    const canvas = faceapi.createCanvasFromMedia(videoRef.current);
    document.getElementById("video-container").append(canvas);
    const displaySize = {
      width: videoRef.current.width,
      height: videoRef.current.height,
    };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    }, 500); // cada medio segundo
  };

  return (
    <div id="video-container" style={{ position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="720"
        height="560"
        onPlay={handleVideoPlay}
        style={{ position: "absolute" }}
      />
    </div>
  );
};

export default FaceDetectionPage;