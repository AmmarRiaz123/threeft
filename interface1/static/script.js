// Only run this code if the CNIC form exists (first page)
const cnicForm = document.getElementById("cnicForm");
if (cnicForm) {
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

      // Store CNIC image as base64 for face verification page
      try {
        localStorage.setItem("cnicImageBase64", e.target.result);
      } catch (err) {
        // Ignore storage errors
      }
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

          // If NADRA verification passed or data extracted, redirect to face verification page after 1s
          setTimeout(() => {
            window.location.href = "/face_verification";
          }, 1000);
        }

        // NADRA error handling (optional, can show message before redirect)
        if (resData.nadra_error) {
          const nadraError = document.createElement("p");
          nadraError.style.color = "red";
          nadraError.style.marginTop = "1em";
          nadraError.innerHTML =
            "❌ NADRA Verification Failed: We couldn’t verify your identity with NADRA. This may be due to access restrictions or a temporary service issue. Please try again later.";
          result.appendChild(nadraError);
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

  // Open webcam or mobile camera
  document.getElementById("openWebcam").addEventListener("click", function (e) {
    e.preventDefault();
    // Use mobile camera if on mobile, otherwise open webcam modal
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      cameraInput.click();
    } else {
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
    }
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
}
