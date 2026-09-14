const carouselContainer = document.querySelector(".carousel__container");
const carouselItem = document.querySelectorAll(".carousel__item");
const carouselControlsContainer = document.querySelector(".carousel__controls-container");
const footerName = document.querySelector(".footer-name");
const footerPrice = document.querySelector(".footer-price");

const carouselControls = ["prev", "next"]; //Un arreglo con los controles disponibles (prev y next), que servirán para mover el carrusel hacia atrás o adelante.

class Carousel {
    constructor(container, items, controls) {
        this.carouselContainer = container;
        this.items = [...items];
        this.controls = controls;

        // Cada planta queda fija en un ángulo alrededor del eje, repartidas en
        // partes iguales (360°/cantidad de plantas). Nunca más se reasignan.
        this.angleStep = 360 / this.items.length;
        this.items.forEach((el, i) => {
            el.style.setProperty("--angle", `${i * this.angleStep}deg`);
        });

        this.rotation = 0; // Ángulo acumulado de la rueda, sin límite (por eso el giro es infinito)
        this.isDragging = false;
        this.startX = 0; // Posición del puntero (mouse o dedo) al iniciar el arrastre
        this.dragDelta = 0; // Cuánto giró la rueda en vivo desde que empezó el arrastre (en deg)
        this.sensitivity = 0.35; // Grados que gira la rueda por cada px arrastrado
        this.rafId = null; // requestAnimationFrame pendiente, para aplicar el giro una vez por frame
        this.frontIndex = null; // índice de la planta que está al frente ahora mismo

        this.useControls();
        this.addPointerEvents();
        this.applyRotation();
    }

    applyRotation(extra = 0) {
        const total = this.rotation + extra;
        this.carouselContainer.style.setProperty("--wheel-rotation", `${total}deg`);
        this.updateFooter(total);
    }

    // Detecta qué planta quedó al frente con el ángulo actual (en vivo, incluso
    // a mitad de un arrastre) y, solo si cambió respecto a la anterior, actualiza
    // el nombre/precio del footer con los de esa planta.
    updateFooter(total) {
        const n = this.items.length;
        let index = Math.round(-total / this.angleStep) % n;
        if (index < 0) index += n;
        if (index === this.frontIndex) return;
        this.frontIndex = index;

        const frontItem = this.items[index];
        const title = frontItem.querySelector(".carousel__item-title")?.textContent ?? "";
        const price = frontItem.querySelector(".carousel__item-price")?.textContent ?? "";
        if (footerName) footerName.textContent = title;
        if (footerPrice) footerPrice.textContent = price;
    }

    // Gira la rueda una cantidad fija de plantas (lo usan los botones prev/next).
    rotateBySteps(steps) {
        this.rotation += steps * this.angleStep;
        this.applyRotation();
    }

    setControls() {
        const chevronPath = {
            prev: "M15 18l-6-6 6-6",
            next: "M9 18l6-6-6-6",
        };
        this.controls.forEach((control) => {
            const button = document.createElement("button");
            button.className = `carousel-controls-${control}`;
            button.setAttribute("aria-label", control === "prev" ? "Anterior" : "Siguiente");
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${chevronPath[control]}" />
                </svg>
            `;
            carouselControlsContainer.appendChild(button);
        });
    }

    useControls() {
        const triggers = [...carouselControlsContainer.querySelectorAll("button")];
        triggers.forEach((control) => {
            control.addEventListener("click", (e) => {
                e.preventDefault();
                const direction = control.className.includes("prev") ? "prev" : "next";
                this.rotateBySteps(direction === "next" ? -1 : 1);
            });
        });
    }

    // Arrastre unificado (mouse, dedo y stylus) que gira la rueda en tiempo real,
    // como si la estuvieras agarrando y girando físicamente. Al soltar, encastra
    // en la planta más cercana (como los "detents" de una rueda real).
    addPointerEvents() {
        this.carouselContainer.addEventListener("pointerdown", this.startDrag.bind(this));
        this.carouselContainer.addEventListener("pointermove", this.drag.bind(this));
        this.carouselContainer.addEventListener("pointerup", this.endDrag.bind(this));
        this.carouselContainer.addEventListener("pointercancel", this.endDrag.bind(this));

        this.carouselContainer.addEventListener("dragstart", (e) => e.preventDefault());
        this.carouselContainer.addEventListener("selectstart", (e) => e.preventDefault());
    }

    startDrag(event) {
        this.isDragging = true;
        this.startX = event.clientX;
        this.dragDelta = 0;
        this.carouselContainer.setPointerCapture(event.pointerId);
        // Sin transición mientras arrastramos: la rueda debe seguir al dedo/mouse 1 a 1, sin retraso.
        this.carouselContainer.classList.add("is-dragging");
        this.carouselContainer.style.cursor = "grabbing";
    }

    drag(event) {
        if (!this.isDragging) return;

        const distance = event.clientX - this.startX;
        this.dragDelta = distance * this.sensitivity;
        // El mouse/dedo puede disparar más eventos por segundo de los que la
        // pantalla puede pintar. Cada planta recalcula blur/opacidad/escala en
        // vivo, así que aplicamos el giro una sola vez por frame (no una vez por
        // evento) para no repetir ese trabajo de más.
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.applyRotation(this.dragDelta);
                this.rafId = null;
            });
        }
    }

    endDrag(event) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.carouselContainer.releasePointerCapture(event.pointerId);
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        // Reactivamos la transición: desde acá el encastre queda animado.
        this.carouselContainer.classList.remove("is-dragging");
        this.carouselContainer.style.cursor = "grab";

        const total = this.rotation + this.dragDelta;
        this.rotation = Math.round(total / this.angleStep) * this.angleStep;
        this.dragDelta = 0;
        this.applyRotation();
    }
}

// Initialize carousel
const exampleCarousel = new Carousel(carouselContainer, carouselItem, carouselControls);
exampleCarousel.setControls();
exampleCarousel.useControls();
