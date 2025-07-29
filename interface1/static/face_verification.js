document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const takePhotosBtn = document.getElementById("takePhotosBtn");
  const uploadGalleryBtn = document.getElementById("uploadGalleryBtn");
  const faceImagesPreview = document.getElementById("faceImagesPreview");
  const verifyFacesBtn = document.getElementById("verifyFacesBtn");
  const faceVerificationResult = document.getElementById("faceVerificationResult");
  const loader = document.getElementById("loader");
  const webcamModal = document.getElementById("webcamModal");
  const webcam = document.getElementById("webcam");
  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const closeWebcamBtn = document.getElementById("closeWebcamBtn");
  const photoProgress = document.getElementById("photoProgress");

  let faceImagesFiles = [];
  let webcamStream = null;

  // Helper: add a file to the faceImagesFiles array and update UI (for uploads)
  function addFaceImageFileFromUpload(file) {
    if (faceImagesFiles.length < 5 && file) {
      faceImagesFiles.push(file);
      previewFaceImages(faceImagesFiles);
      // Debug: print array after adding
      console.log("[DEBUG] addFaceImageFileFromUpload - faceImagesFiles:", faceImagesFiles, faceImagesFiles.map(f => f.name));
    }
  }

  // Helper: add a file from camera/capture to the array and update UI
  function addFaceImageFileFromCamera(file) {
    if (faceImagesFiles.length < 5 && file) {
      faceImagesFiles.push(file);
      previewFaceImages(faceImagesFiles);
      console.log("[DEBUG] addFaceImageFileFromCamera - faceImagesFiles:", faceImagesFiles, faceImagesFiles.map(f => f.name));
    }
  }

  // Helper: Enable/disable verify button based on image count
  function updateVerifyButtonState() {
    // Progress bar loader
    let count = faceImagesFiles.length;
    let progressPercent = (count / 5) * 100;
    let bar = `
      <div class="photo-progress-bar-label">${count}/5 photos selected</div>
      <div class="photo-progress-bar-outer">
        <div class="photo-progress-bar-inner" style="width:${progressPercent}%;"></div>
      </div>
    `;
    photoProgress.innerHTML = bar;
    if (count === 5) {
      verifyFacesBtn.style.display = "";
      verifyFacesBtn.disabled = false;
    } else {
      verifyFacesBtn.style.display = "none";
      verifyFacesBtn.disabled = true;
    }
  }

  // Preview face images
  function previewFaceImages(files) {
    faceImagesPreview.innerHTML = "";
    // Only show the latest image (last in array)
    if (files.length > 0) {
      const file = files[files.length - 1];
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "120px";
        img.style.margin = "5px";
        img.style.boxShadow = "0 0 16px #ff416c55";
        faceImagesPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
    // Debug: print array after each update
    console.log("[DEBUG] previewFaceImages - faceImagesFiles:", faceImagesFiles, faceImagesFiles.map(f => f.name));
    updateVerifyButtonState();
  }

  // Take Picture button: open camera on mobile, webcam modal on desktop
  takePhotosBtn.addEventListener("click", function (e) {
    e.preventDefault();
    if (faceImagesFiles.length >= 5) return;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInput.value = "";
      cameraInput.click();
    } else {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
          webcamStream = stream;
          webcam.srcObject = stream;
          webcamModal.style.display = "flex";
        })
        .catch(function (err) {
          alert("Camera not accessible.");
          console.error(err);
        });
    }
  });

  capturePhotoBtn.addEventListener("click", function () {
    if (!webcamStream) return;
    if (faceImagesFiles.length >= 5) return;
    const canvas = document.createElement("canvas");
    canvas.width = webcam.videoWidth || 320;
    canvas.height = webcam.videoHeight || 240;
    canvas.getContext("2d").drawImage(webcam, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
      if (faceImagesFiles.length < 5) {
        const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: "image/jpeg" });
        addFaceImageFileFromCamera(file);
        if (faceImagesFiles.length >= 5) {
          closeWebcam();
        }
      }
    }, "image/jpeg");
  });

  closeWebcamBtn.addEventListener("click", closeWebcam);

  function closeWebcam() {
    webcamModal.style.display = "none";
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      webcam.srcObject = null;
      webcamStream = null;
    }
  }

  // Upload from Gallery button triggers gallery input
  uploadGalleryBtn.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("**** Upload from Gallery button clicked ****");
    galleryInput.value = ""; // reset
    galleryInput.click();
  });

  // Use the new helper for gallery uploads (add one at a time)
  galleryInput.addEventListener("change", function () {
    if (!this.files.length) return;
    if (faceImagesFiles.length >= 5) return;
    addFaceImageFileFromUpload(this.files[0]);
    this.value = "";
  });

  // Use the new helper for camera input (mobile)
  cameraInput.addEventListener("change", function () {
    if (!this.files.length) return;
    if (faceImagesFiles.length >= 5) return;
    addFaceImageFileFromCamera(this.files[0]);
    this.value = "";
  });

  // Handle face verification
  verifyFacesBtn.addEventListener("click", function () {
    faceVerificationResult.innerHTML = "";
    // Get CNIC image from localStorage (set on first page)
    const cnicImageBase64 = localStorage.getItem("cnicImageBase64");
    if (!cnicImageBase64) {
      faceVerificationResult.innerHTML = `<p style="color:red;">CNIC image not found. Please scan your CNIC first.</p>`;
      return;
    }
    if (faceImagesFiles.length !== 5) {
      faceVerificationResult.innerHTML = `<p style="color:red;">Please select exactly 5 face images.</p>`;
      return;
    }
    loader.style.display = "flex";
    const formData = new FormData();

    // Convert base64 CNIC image to Blob
    function dataURLtoBlob(dataurl) {
      const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
      return new Blob([u8arr], { type: mime });
    }
    const cnicBlob = dataURLtoBlob(cnicImageBase64);
    formData.append("cnic_image", cnicBlob, "cnic.jpg");
    faceImagesFiles.forEach((file, idx) => {
      formData.append("face_image_" + idx, file);
    });

    fetch("/face_verify", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        loader.style.display = "none";
        let data = null;
        try {
          data = await res.json();
        } catch (e) {
          faceVerificationResult.innerHTML = `<p style="color:red;">Server error: Invalid response.</p>`;
          return;
        }
        if (data.verified) {
          faceVerificationResult.innerHTML = `<div class="success-message"><div class="checkmark-wrapper"><span class="checkmark-circle"><span class="checkmark-stem"></span><span class="checkmark-kick"></span></span>Face Verified! Voting Token: <b>${data.token}</b></div></div>`;
        } else {
          faceVerificationResult.innerHTML = `<p style="color:red;">Face verification failed: ${data.reason || "Not matched."}</p>`;
        }
      })
      .catch((err) => {
        loader.style.display = "none";
        faceVerificationResult.innerHTML = `<p style="color:red;">Error during verification.</p>`;
      });
  });

  // Initial state
  previewFaceImages(faceImagesFiles);
});
