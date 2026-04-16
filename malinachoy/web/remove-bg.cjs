const { Jimp } = require("jimp");

async function run() {
  try {
    const image = await Jimp.read("public/logo.jpg");
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Remove near black pixels with optimal threshold of 40
      if (r < 40 && g < 40 && b < 40) {
        this.bitmap.data[idx + 3] = 0; // Set alpha to 0
      }
    });
    
    await image.write("public/logo.png");
    console.log("Successfully created logo.png with transparent background!");
  } catch (error) {
    console.error("Error formatting image:", error);
  }
}

run();
