(() => {
  class Petal {
    constructor(width, height) {
      this.reset(width, height, true);
    }

    reset(width, height, initial = false) {
      this.baseX = Math.random() * width;
      this.x = this.baseX;
      this.y = initial ? Math.random() * height : -20 - Math.random() * height * 0.2;
      this.size = 6 + Math.random() * 6;
      this.speedY = 0.3 + Math.random() * 0.5;
      this.swayAmplitude = 8 + Math.random() * 24;
      this.swaySpeed = 0.01 + Math.random() * 0.02;
      this.phase = Math.random() * Math.PI * 2;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = -0.015 + Math.random() * 0.03;
      this.alpha = 0.28 + Math.random() * 0.24;
      this.hueShift = -7 + Math.random() * 14;
    }

    update(width, height, tick) {
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.x = this.baseX + Math.sin(tick * this.swaySpeed + this.phase) * this.swayAmplitude;

      if (this.y > height + 24) {
        this.reset(width, height, false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(1, 0.72);

      const green = Math.max(120, 140 + this.hueShift);
      const blue = Math.max(145, 165 + this.hueShift);
      ctx.fillStyle = `rgba(232, ${green}, ${blue}, ${this.alpha.toFixed(3)})`;

      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.quadraticCurveTo(this.size * 0.95, -this.size * 0.15, 0, this.size);
      ctx.quadraticCurveTo(-this.size * 0.95, -this.size * 0.15, 0, -this.size);
      ctx.fill();

      ctx.restore();
    }
  }

  const initParticles = () => {
    const hero = document.getElementById('hero');
    if (!hero) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'particles-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const particleCount = 30 + Math.floor(Math.random() * 21);
    const petals = [];
    let width = 0;
    let height = 0;
    let tick = 0;
    let frameId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!petals.length) {
        for (let i = 0; i < particleCount; i += 1) {
          petals.push(new Petal(width, height));
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      tick += 1;
      petals.forEach((petal) => {
        petal.update(width, height, tick);
        petal.draw(ctx);
      });

      frameId = window.requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        return;
      }

      window.cancelAnimationFrame(frameId);
      render();
    };

    resize();
    render();

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
  };

  document.addEventListener('DOMContentLoaded', initParticles);
})();
