import easyocr
import os
print("🔍 Starting OCR process...")
# Check if the file exists
image_path = 'cnic.png'
if not os.path.exists(image_path):
    print(f"❌ Image file '{image_path}' not found.")
else:
    try:
        # Initialize the reader (make sure to install the necessary language models)
        reader = easyocr.Reader(['en'], gpu=False)

        # Read text from the image
        results = reader.readtext(image_path, detail=0)

        # Print each detected line
        print("✅ Extracted Text:")
        for line in results:
            print(line)

    except Exception as e:
        print("⚠️ Something went wrong while reading the image.")
        print(f"Error details: {e}")
