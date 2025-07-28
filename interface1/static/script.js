const cameraInput = document.getElementById("cameraInput");
const uploadInput = document.getElementById("uploadInput");
const preview = document.getElementById("preview");
const result = document.getElementById("result");
const loader = document.getElementById("loader");

const webcamModal = document.getElementById("webcamModal");
const webcam = document.getElementById("webcam");
const captureBtn = document.getElementById("captureBtn");
const closeWebcam = document.getElementById("closeWebcam");
let webcamStream = null;

// Handle single image upload
function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // Clear UI
  preview.innerHTML = "";
  result.innerHTML = "";
  preview.style.opacity = "1";
  loader.style.display = "flex";

  const formData = new FormData();
  formData.append("image", file); // only one image now

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    preview.appendChild(img);
  };
  reader.readAsDataURL(file);

  fetch("/ocr", {
    method: "POST",
    body: formData,
  })
    .then(async (res) => {
      loader.style.display = "none";
      const container = document.createElement("div");
      container.className = "info-block";

      let resData = null;
      try {
        resData = await res.json();
      } catch (err) {
        container.innerHTML = `<p style="color:red;">❌ Server response not valid JSON.</p>`;
        result.appendChild(container);
        result.scrollIntoView({ behavior: "smooth" });
        return;
      }

      // Display any OCR results (even if NADRA check fails)
      if (resData.data) {
        const d = resData.data;
        container.innerHTML = `
          <div class="success-tick">✅ CNIC Data Extracted</div>
          <p><strong>Name:</strong> ${d.name || "-"}</p>
          <p><strong>Father's Name:</strong> ${d.father_name || "-"}</p>
          <p><strong>Gender:</strong> ${d.gender || "-"}</p>
          <p><strong>CNIC Number:</strong> ${d.cnic_number || "-"}</p>
          <p><strong>Date of Birth:</strong> ${d.dob || "-"}</p>
          <p><strong>Issue Date:</strong> ${d.issue_date || "-"}</p>
          <p><strong>Expiry Date:</strong> ${d.expiry_date || "-"}</p>
        `;
        result.appendChild(container);
      }

      // Now handle NADRA verification failure if it applies
      if (
        res.status === 503 ||
        (resData.error === "NADRA verification failed" && resData.reason?.includes("Access not granted"))
      ) {
        const nadraError = document.createElement("p");
        nadraError.style.color = "red";
        nadraError.style.marginTop = "1em";
        nadraError.innerHTML =
          "❌ NADRA Verification Failed: We couldn’t verify your identity with NADRA. This may be due to access restrictions or a temporary service issue. Please try again later.";
        result.appendChild(nadraError);
      }

      // If general failure
      if (!res.ok && !resData.data) {
        container.innerHTML = `<p style="color:red;">❌ Server Error (${res.status})</p>`;
        result.appendChild(container);
      }

      result.scrollIntoView({ behavior: "smooth" });
    })
    .catch((err) => {
      loader.style.display = "none";
      console.error("OCR Error:", err);
      result.innerHTML = `<p style="color:red;">⚠️ Something went wrong while extracting data. Please try again shortly.</p>`;
    });
}

// Upload from file input
uploadInput.addEventListener("change", function () {
  handleImageUpload(this);
});

// Mobile camera input (if used)
cameraInput.addEventListener("change", function () {
  handleImageUpload(this);
});

// Open webcam
document.getElementById("openWebcam").addEventListener("click", function (e) {
  e.preventDefault();
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      webcamStream = stream;
      webcam.srcObject = stream;
      webcamModal.style.display = "flex";
    })
    .catch(err => {
      alert("Camera not accessible, sweetheart.");
      console.error(err);
    });
});

// Capture from webcam
captureBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = webcam.videoWidth;
  canvas.height = webcam.videoHeight;
  canvas.getContext("2d").drawImage(webcam, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(file);
    uploadInput.files = dt.files;
    handleImageUpload(uploadInput);
  });
  closeWebcamModal();
});

// Close webcam modal
closeWebcam.addEventListener("click", closeWebcamModal);

function closeWebcamModal() {
  webcamModal.style.display = "none";
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcam.srcObject = null;
  }
}

const faceImagesInput = document.getElementById("faceImagesInput");
const faceImagesPreview = document.getElementById("faceImagesPreview");
const verifyFacesBtn = document.getElementById("verifyFacesBtn");
const faceVerificationResult = document.getElementById("faceVerificationResult");

let faceImagesFiles = [];

// Preview selected face images
faceImagesInput.addEventListener("change", function () {
  faceImagesPreview.innerHTML = "";
  faceImagesFiles = Array.from(this.files).slice(0, 5);
  faceImagesFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "80px";
      img.style.margin = "5px";
      faceImagesPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// Trigger file input when label is clicked
document.querySelector('label[for="faceImagesInput"]').addEventListener("click", function () {
  faceImagesInput.click();
});

// Handle face verification
verifyFacesBtn.addEventListener("click", function () {
  faceVerificationResult.innerHTML = "";
  if (faceImagesFiles.length !== 5) {
    faceVerificationResult.innerHTML = `<p style="color:red;">Please select exactly 5 face images.</p>`;
    return;
  }
  // Assume CNIC image is already uploaded and previewed
  const cnicFile = uploadInput.files[0];
  if (!cnicFile) {
    faceVerificationResult.innerHTML = `<p style="color:red;">Please upload your CNIC image first.</p>`;
    return;
  }
  loader.style.display = "flex";
  const formData = new FormData();
  formData.append("cnic_image", cnicFile);
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
