/* =========================================================
   PAE | INTERACTION ENGINE
   Scroll reveal · Interactive demo · Smart header
   Cursor spotlight · Shared theme
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       0. CONFIGURACIÓN GENERAL
    ===================================================== */

    const root = document.documentElement;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const mobileViewport = window.matchMedia(
        "(max-width: 700px)"
    );

    const finePointer = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    );


    /* =====================================================
       1. SCROLL REVEAL
       Hace aparecer los elementos al entrar en pantalla.
    ===================================================== */

    function initializeReveal() {

        const elements = document.querySelectorAll(".reveal");

        if (!elements.length) return;

        // Accesibilidad: mostrar directamente si se reducen
        // las animaciones o no existe IntersectionObserver.
        if (
            reducedMotion.matches ||
            !("IntersectionObserver" in window)
        ) {
            elements.forEach((element) => {
                element.classList.add("is-visible");
            });

            return;
        }

        const observer = new IntersectionObserver(
            (entries, currentObserver) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");

                    // Cada elemento se anima una sola vez.
                    currentObserver.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );

        elements.forEach((element) => {
            observer.observe(element);
        });
    }


    /* =====================================================
       2. DEMOSTRACIÓN INTERACTIVA
       Sincroniza el mockup con las explicaciones.
    ===================================================== */

    function initializeDemo() {

        const steps = Array.from(
            document.querySelectorAll(".demo-step")
        );

        const panels = Array.from(
            document.querySelectorAll(".demo-panel")
        );

        const dots = Array.from(
            document.querySelectorAll(".screen-dot")
        );

        const caption = document.querySelector(".demo-caption");

        // La demostración no existe en todas las páginas.
        if (!steps.length || !panels.length) return;

        let activeScreen = -1;
        let captionTimer = null;
        let demoObserver = null;

        const stepMap = new Map();
        const panelMap = new Map();
        const dotMap = new Map();

        const visibleRatios = new Map();


        /* ---------------------------------------------
           Registrar pantallas disponibles
        --------------------------------------------- */

        steps.forEach((step, position) => {

            const index = Number(step.dataset.step);

            if (Number.isInteger(index)) {
                stepMap.set(index, step);
                visibleRatios.set(index, 0);
            }
        });

        panels.forEach((panel, position) => {

            const index = Number.isInteger(Number(panel.dataset.screen))
                ? Number(panel.dataset.screen)
                : position;

            panelMap.set(index, panel);
        });

        dots.forEach((dot) => {

            const index = Number(dot.dataset.jumpTo);

            if (Number.isInteger(index)) {
                dotMap.set(index, dot);
            }
        });


        /* ---------------------------------------------
           Cambiar la pantalla del teléfono
        --------------------------------------------- */

        function changeDemoScreen(index) {

            if (!panelMap.has(index)) return;

            if (index === activeScreen) return;

            activeScreen = index;


            // Cambiar las imágenes o pantallas del mockup.
            panelMap.forEach((panel, panelIndex) => {

                const active = panelIndex === index;

                panel.classList.toggle("is-active", active);

                panel.setAttribute(
                    "aria-hidden",
                    String(!active)
                );
            });


            // Actualizar el paso seleccionado.
            stepMap.forEach((step, stepIndex) => {

                const active = stepIndex === index;

                step.classList.toggle("is-active", active);

                step.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            });


            // Actualizar los indicadores inferiores.
            dotMap.forEach((dot, dotIndex) => {

                const active = dotIndex === index;

                dot.classList.toggle("is-active", active);

                dot.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            });


            // Actualizar el texto descriptivo.
            if (caption) {

                window.clearTimeout(captionTimer);

                caption.style.opacity = "0";

                captionTimer = window.setTimeout(() => {

                    const selectedStep = stepMap.get(index);

                    caption.textContent =
                        selectedStep?.dataset.caption ||
                        "Explora el PAE";

                    caption.style.opacity = "1";

                }, reducedMotion.matches ? 0 : 150);
            }
        }


        /* ---------------------------------------------
           Seleccionar paso

           PC: desplaza hasta la explicación.
           Móvil: cambia la pantalla sin desplazar.
        --------------------------------------------- */

        function selectDemoStep(index) {

            const step = stepMap.get(index);

            if (!step || !panelMap.has(index)) return;

            changeDemoScreen(index);

            // En móvil no queremos saltos automáticos.
            if (mobileViewport.matches) return;

            step.scrollIntoView({
                behavior: reducedMotion.matches ? "auto" : "smooth",
                block: "center"
            });
        }


        /* ---------------------------------------------
           Controlar la sincronización mediante scroll
        --------------------------------------------- */

        function destroyDemoObserver() {

            if (!demoObserver) return;

            demoObserver.disconnect();
            demoObserver = null;
        }


        function initializeDemoObserver() {

            destroyDemoObserver();

            // En móvil todas las explicaciones permanecen visibles.
            // El usuario cambia la pantalla mediante los indicadores
            // o tocando una explicación.
            if (mobileViewport.matches) {

                steps.forEach((step) => {
                    step.classList.add("has-entered");
                });

                return;
            }

            // Sin IntersectionObserver, dejar los pasos visibles.
            if (!("IntersectionObserver" in window)) {

                steps.forEach((step) => {
                    step.classList.add("has-entered");
                });

                return;
            }


            visibleRatios.clear();

            steps.forEach((step) => {
                visibleRatios.set(Number(step.dataset.step), 0);
            });


            demoObserver = new IntersectionObserver(
                (entries) => {

                    entries.forEach((entry) => {

                        const index = Number(entry.target.dataset.step);

                        if (!Number.isInteger(index)) return;

                        if (entry.isIntersecting) {

                            entry.target.classList.add("has-entered");

                            visibleRatios.set(
                                index,
                                entry.intersectionRatio
                            );

                        } else {

                            visibleRatios.set(index, 0);
                        }
                    });


                    // Elegir el paso con mayor visibilidad.
                    const mostVisible = [...visibleRatios.entries()]
                        .filter(([, ratio]) => ratio > 0)
                        .sort((a, b) => b[1] - a[1])[0];

                    if (mostVisible) {
                        changeDemoScreen(mostVisible[0]);
                    }
                },
                {
                    threshold: [0.15, 0.3, 0.45, 0.6, 0.75],
                    rootMargin: "-15% 0px -15% 0px"
                }
            );

            steps.forEach((step) => {
                demoObserver.observe(step);
            });
        }


        /* ---------------------------------------------
           Eventos de los pasos
        --------------------------------------------- */

        steps.forEach((step) => {

            const select = () => {

                const index = Number(step.dataset.step);

                if (Number.isInteger(index)) {
                    selectDemoStep(index);
                }
            };

            step.addEventListener("click", select);

            step.addEventListener("keydown", (event) => {

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                event.preventDefault();

                select();
            });
        });


        /* ---------------------------------------------
           Eventos de los indicadores del teléfono
        --------------------------------------------- */

        dots.forEach((dot) => {

            dot.addEventListener("click", () => {

                const index = Number(dot.dataset.jumpTo);

                if (Number.isInteger(index)) {
                    selectDemoStep(index);
                }
            });
        });


        /* ---------------------------------------------
           Inicialización
        --------------------------------------------- */

        changeDemoScreen(0);

        initializeDemoObserver();


        // Adaptar comportamiento si cambia el tamaño
        // de la ventana o se rota el dispositivo.
        const handleViewportChange = () => {
            initializeDemoObserver();
        };

        if (mobileViewport.addEventListener) {
            mobileViewport.addEventListener(
                "change",
                handleViewportChange
            );
        } else {
            mobileViewport.addListener(handleViewportChange);
        }
    }


    /* =====================================================
       3. SMART HEADER
       Oculta la navegación al bajar en PC y la muestra
       al subir. En móviles permanece visible.
    ===================================================== */

    function initializeNavbar() {

        const navbar = document.querySelector(".navbar");

        if (!navbar) return;

        let lastScrollY = window.scrollY;
        let animationFrame = null;

        const scrollThreshold = 8;
        const topThreshold = 80;


        function updateNavbar() {

            const currentScrollY = Math.max(
                0,
                window.scrollY
            );

            const delta = currentScrollY - lastScrollY;


            // No ocultar el menú en pantallas pequeñas.
            if (mobileViewport.matches) {

                navbar.classList.remove("is-hidden");

                lastScrollY = currentScrollY;
                animationFrame = null;

                return;
            }


            // Cerca del inicio, la navegación siempre aparece.
            if (currentScrollY < topThreshold) {

                navbar.classList.remove("is-hidden");

            } else if (delta > scrollThreshold) {

                // Bajando.
                navbar.classList.add("is-hidden");

            } else if (delta < -scrollThreshold) {

                // Subiendo.
                navbar.classList.remove("is-hidden");
            }


            lastScrollY = currentScrollY;
            animationFrame = null;
        }


        window.addEventListener(
            "scroll",
            () => {

                if (animationFrame !== null) return;

                animationFrame = window.requestAnimationFrame(
                    updateNavbar
                );
            },
            { passive: true }
        );


        // Actualizar el menú si se rota o cambia el tamaño.
        const handleViewportChange = () => {

            navbar.classList.remove("is-hidden");

            lastScrollY = window.scrollY;
        };

        if (mobileViewport.addEventListener) {
            mobileViewport.addEventListener(
                "change",
                handleViewportChange
            );
        } else {
            mobileViewport.addListener(handleViewportChange);
        }
    }


    /* =====================================================
       4. CURSOR SPOTLIGHT
       Efecto de iluminación exclusivo para mouse.
    ===================================================== */

    function initializeSpotlight() {

        if (reducedMotion.matches || !finePointer.matches) return;

        const targets = document.querySelectorAll(
            ".feature-card, .teacher-card, .teacher-option"
        );

        targets.forEach((element) => {

            let frameId = null;
            let pointerX = 0;
            let pointerY = 0;


            element.addEventListener(
                "pointermove",
                (event) => {

                    pointerX = event.clientX;
                    pointerY = event.clientY;

                    if (frameId !== null) return;

                    frameId = window.requestAnimationFrame(() => {

                        const rect = element.getBoundingClientRect();

                        const x = pointerX - rect.left;
                        const y = pointerY - rect.top;

                        const relativeX =
                            (x / Math.max(rect.width, 1)) * 100;

                        const relativeY =
                            (y / Math.max(rect.height, 1)) * 100;

                        element.style.setProperty(
                            "--mouse-x",
                            `${relativeX}%`
                        );

                        element.style.setProperty(
                            "--mouse-y",
                            `${relativeY}%`
                        );

                        frameId = null;
                    });
                },
                { passive: true }
            );


            element.addEventListener("pointerleave", () => {

                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                    frameId = null;
                }

                element.style.setProperty("--mouse-x", "50%");
                element.style.setProperty("--mouse-y", "50%");
            });
        });
    }


    /* =====================================================
       5. SHARED THEME CONTROLLER
       Comparte la preferencia de tema entre páginas.
    ===================================================== */

    function initializeTheme() {

        const themeButton = document.querySelector(".theme-toggle");

        const themeMeta = document.querySelector(
            'meta[name="theme-color"]'
        );


        /* ---------------------------------------------
           Leer preferencia guardada
        --------------------------------------------- */

        function readSavedTheme() {

            try {

                const saved = window.localStorage.getItem(
                    "pae-theme"
                );

                if (saved === "dark" || saved === "light") {
                    return saved;
                }

            } catch (error) {

                console.warn(
                    "PAE: No se pudo leer la preferencia de tema.",
                    error
                );
            }

            return root.dataset.theme === "dark"
                ? "dark"
                : "light";
        }


        /* ---------------------------------------------
           Aplicar tema
        --------------------------------------------- */

        function setTheme(theme, persist = true) {

            const selectedTheme =
                theme === "dark" ? "dark" : "light";

            const isDark = selectedTheme === "dark";


            root.dataset.theme = selectedTheme;


            // Actualizar controles.
            if (themeButton) {

                themeButton.setAttribute(
                    "aria-label",
                    isDark
                        ? "Cambiar a modo claro"
                        : "Cambiar a modo oscuro"
                );

                themeButton.setAttribute(
                    "aria-pressed",
                    String(isDark)
                );

                themeButton.title = isDark
                    ? "Activar modo claro"
                    : "Activar modo oscuro";
            }


            // Actualizar barra de color del navegador.
            if (themeMeta) {

                themeMeta.setAttribute(
                    "content",
                    isDark ? "#0D0C0E" : "#6C1F2F"
                );
            }


            // Guardar preferencia.
            if (persist) {

                try {

                    window.localStorage.setItem(
                        "pae-theme",
                        selectedTheme
                    );

                } catch (error) {

                    console.warn(
                        "PAE: No se pudo guardar el tema.",
                        error
                    );
                }
            }
        }


        /* ---------------------------------------------
           Inicializar tema
        --------------------------------------------- */

        setTheme(readSavedTheme(), false);


        /* ---------------------------------------------
           Evitar doble controlador en Acerca de
        --------------------------------------------- */

        const hasInlineAboutController =
            themeButton?.id === "aboutThemeToggle";

        if (themeButton && !hasInlineAboutController) {

            themeButton.addEventListener("click", () => {

                const nextTheme =
                    root.dataset.theme === "dark"
                        ? "light"
                        : "dark";

                setTheme(nextTheme);
            });
        }


        /* ---------------------------------------------
           Sincronizar otras pestañas
        --------------------------------------------- */

        window.addEventListener("storage", (event) => {

            if (event.key !== "pae-theme") return;

            if (
                event.newValue !== "dark" &&
                event.newValue !== "light"
            ) {
                return;
            }

            setTheme(event.newValue, false);
        });
    }


    /* =====================================================
       6. INICIALIZAR SISTEMA
    ===================================================== */

    initializeReveal();

    initializeDemo();

    initializeNavbar();

    initializeSpotlight();

    initializeTheme();

})();