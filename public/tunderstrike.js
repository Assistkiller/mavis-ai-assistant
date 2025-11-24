const canvas = document.getElementById("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const ctx = canvas.getContext("2d");

const LEFT = "LEFT";
const RIGHT = "RIGHT";

const getDir = () => {
  const dec = Math.floor(Math.random() * 30);
  if (dec < 16) return LEFT;
  else return RIGHT;
};

class Cloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.floor(Math.random() * 30);
    this.clr = "silver";
    this.dir = getDir();
    this.speed = Math.floor(Math.random() * 2) + 1;
  }
  
  moveLeft() {
    this.x -= this.speed;
  }
  
  moveRight() {
    this.x += this.speed;
  }

  update() {
    if (this.x <= 0) {
      this.dir = RIGHT;
    } else if (this.x >= canvas.width) {
      this.dir = LEFT;
    }

    if (this.dir === LEFT) {
      this.moveLeft();
    } else {
      this.moveRight();
    }
  }

  drawRoot(x, y) {
    let sx = x,
        sy = y,
        ex = sx + Math.floor(Math.random() * 50) - 15,
        ey = sy + Math.floor(Math.random() * 30);
    let i = 0,
        limit = Math.floor(Math.random() * 20);
    while (i < limit) {
      ctx.beginPath();
      ctx.strokeStyle = "silver";
      ctx.lineWidth = 1;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      sx = ex;
      sy = ey;
      ex = sx + Math.floor(Math.random() * 50) - 15;
      ey = sy + Math.floor(Math.random() * 30);
      i++;
    }
  }

  drawLightning() {
    // No longer fills the canvas to keep the background transparent
    let sx = this.x,
        sy = this.y,
        ex = sx + Math.floor(Math.random() * 30) - 15,
        ey = sy + Math.floor(Math.random() * 30);

    let i = 0,
        limit = Math.floor(Math.random() * 20) + 20;

    while (i < limit) {
      ctx.beginPath();
      ctx.strokeStyle = "silver";
      ctx.lineWidth = 3;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      sx = ex;
      sy = ey;
      ex = sx + Math.floor(Math.random() * 30) - 15;
      ey = sy + Math.floor(Math.random() * 30);
      let root = Math.floor(Math.random() * 1000);
      if (root < 50) {
        this.drawRoot(sx, sy);
      }
      i++;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.clr;
    const strike = Math.floor(Math.random() * 100000);
    if (strike < 50) {
      this.drawLightning();
    }
  }
}

const clouds = [];

let i = 100;

while (i < canvas.width - 100) {
  clouds.push(new Cloud(i, 0));
  i += Math.floor(Math.random() * 10) + 1;
}

const animate = () => {
  // Clear the canvas each frame to maintain transparency
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let c of clouds) {
    c.draw();
    c.update();
  }

  requestAnimationFrame(animate);
};

// Start the animation
animate();

// Handle resizing the canvas
window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});