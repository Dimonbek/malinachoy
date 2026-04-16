import Jimp from "jimp";

async function run() {
  try {
    const image = await Jimp.read("public/logo.jpg");
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Remove near black pixels (threshold 30)
      if (r < 30 && g < 30 && b < 30) {
        this.bitmap.data[idx + 3] = 0; // Set alpha to 0
      }
    });
    
    // Edge smoothing (basic anti-aliasing approximation could be added but let's keep it simple first)
    
    await image.writeAsync("public/logo.png");
    console.log("Successfully created logo.png with transparent background!");
  } catch (error) {
    console.error("Error formatting image:", error);
  }
}

run();
