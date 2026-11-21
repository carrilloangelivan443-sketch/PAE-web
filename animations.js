/* =========================================================
   PAE | INTERACTION ENGINE
   Scroll reveal · Demo · Smart header · Spotlight · Theme
   ========================================================= */

(() => {
    "use strict";

    const root = document.documentElement;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


    /* =====================================================
       1. SCROLL REVEAL
       Cada elemento aparece una sola vez.
    ===================================================== */

    const revealElements = document.querySelectorAll(".reveal");

    if (
        prefersReducedMotion ||
        !("IntersectionObserver" in window)
    ) {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });

    } else if (revealElements.length > 0) {

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");

                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });
    }


    /* =====================================================
       2. INTERACTIVE APP DEMO
       Cambia el teléfono y sincroniza las explicaciones.
    ===================================================== */

    const demoSteps = Array.from(
        document.querySelectorAll(".demo-step")
    );

    const demoPanels = Array.from(
        document.querySelectorAll(".demo-panel")
    );

    const demoDots = Array.from(
        document.querySelectorAll(".screen-dot")
    );

    const demoCaption = document.querySelector(".demo-caption");

    let activeScreen = -1;
    let captionTimer = null;


    /* Cambiar la pantalla activa */

    function changeDemoScreen(index) {

        const validIndex =
            Number.isInteger(index) &&
            index >= 0 &&
            index < demoSteps.length &&
            index < demoPanels.length;

        if (!validIndex || index === activeScreen) return;

        activeScreen = index;


        /* Actualizar pantallas del teléfono */

        demoPanels.forEach((panel, panelIndex) => {

            const isActive = panelIndex === index;

            panel.classList.toggle("is-active", isActive);

            panel.setAttribute(
                "aria-hidden",
                String(!isActive)
            );
        });


        /* Actualizar explicaciones */

        demoSteps.forEach((step, stepIndex) => {

            const isActive = stepIndex === index;

            step.classList.toggle("is-active", isActive);

            step.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });


        /* Actualizar indicadores */

        demoDots.forEach((dot) => {

            const dotIndex = Number(dot.dataset.jumpTo);

            const isActive = dotIndex === index;

            dot.classList.toggle("is-active", isActive);

            dot.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });


        /* Actualizar descripción bajo el teléfono */

        if (demoCaption) {

            window.clearTimeout(captionTimer);

            demoCaption.style.opacity = "0";

            captionTimer = window.setTimeout(() => {

                demoCaption.textContent =
                    demoSteps[index].dataset.caption ||
                    "Explora el PAE";

                demoCaption.style.opacity = "1";

            }, prefersReducedMotion ? 0 : 160);
        }
    }


    /* Desplazarse hasta una explicación */

    function scrollToDemoStep(index) {

        const step = demoSteps[index];

        if (!step) return;

        changeDemoScreen(index);

        step.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center"
        });
    }


    /* Inicializar demostración */

    if (demoSteps.length > 0 && demoPanels.length > 0) {

        if (
            prefersReducedMotion ||
            !("IntersectionObserver" in window)
        ) {

            /* Sin animación: dejar todos los textos visibles */

            demoSteps.forEach((step) => {
                step.classList.add("has-entered");
            });

        } else {

            /*
             * Un único observador realiza dos tareas:
             *
             * 1. Revela cada texto la primera vez que aparece.
             * 2. Mantiene sincronizado el teléfono con el scroll.
             *
             * La clase has-entered nunca se elimina.
             */

            const demoObserver = new IntersectionObserver(
                (entries) => {

                    /* Revelar cada explicación una sola vez */

                    entries.forEach((entry) => {

                        if (!entry.isIntersecting) return;

                        entry.target.classList.add("has-entered");
                    });


                    /* Sincronizar la pantalla del teléfono */

                    const visibleEntries = entries
                        .filter((entry) => entry.isIntersecting)
                        .sort(
                            (a, b) =>
                                b.intersectionRatio -
                                a.intersectionRatio
                        );

                    if (visibleEntries.length === 0) return;

                    const nextIndex = Number(
                        visibleEntries[0].target.dataset.step
                    );

                    if (Number.isInteger(nextIndex)) {
                        changeDemoScreen(nextIndex);
                    }
                },
                {
                    threshold: [0.25, 0.4, 0.55, 0.7],
                    rootMargin: "-18% 0px -18% 0px"
                }
            );

            demoSteps.forEach((step) => {
                demoObserver.observe(step);
            });
        }


        /* Seleccionar explicación con clic o teclado */

        demoSteps.forEach((step) => {

            const selectStep = () => {

                const index = Number(step.dataset.step);

                if (Number.isInteger(index)) {
                    scrollToDemoStep(index);
                }
            };

            step.addEventListener("click", selectStep);

            step.addEventListener("keydown", (event) => {

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                event.preventDefault();

                selectStep();
            });
        });


        /* Seleccionar pantalla mediante indicadores */

        demoDots.forEach((dot) => {

            dot.addEventListener("click", () => {

                const index = Number(dot.dataset.jumpTo);

                if (Number.isInteger(index)) {
                    scrollToDemoStep(index);
                }
            });
        });


        /* Primera pantalla */

        changeDemoScreen(0);
    }


    /* =====================================================
       3. SMART HEADER
       Ocultar al bajar y mostrar al subir.
    ===================================================== */

    const navbar = document.querySelector(".navbar");

    if (navbar) {

        let lastScrollY = window.scrollY;
        let ticking = false;

        const scrollThreshold = 8;
        const topThreshold = 80;


        const updateNavbar = () => {

            const currentScrollY = Math.max(
                0,
                window.scrollY
            );

            const delta = currentScrollY - lastScrollY;


            if (
                currentScrollY < topThreshold ||
                delta < -scrollThreshold
            ) {

                navbar.classList.remove("is-hidden");

            } else if (delta > scrollThreshold) {

                navbar.classList.add("is-hidden");
            }


            lastScrollY = currentScrollY;

            ticking = false;
        };


        window.addEventListener(
            "scroll",
            () => {

                if (ticking) return;

                ticking = true;

                window.requestAnimationFrame(updateNavbar);
            },
            { passive: true }
        );
    }


    /* =====================================================
       4. CURSOR SPOTLIGHT
       Iluminación que sigue al cursor.
    ===================================================== */

    const spotlightTargets = document.querySelectorAll(
        ".feature-card, .teacher-card, .teacher-option"
    );

    const hasFinePointer = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    ).matches;


    if (hasFinePointer && !prefersReducedMotion) {

        spotlightTargets.forEach((element) => {

            let frameId = 0;

            let latestX = 0;
            let latestY = 0;


            element.addEventListener(
                "pointermove",
                (event) => {

                    latestX = event.clientX;
                    latestY = event.clientY;

                    if (frameId) return;


                    frameId = window.requestAnimationFrame(() => {

                        const rect =
                            element.getBoundingClientRect();

                        const x = latestX - rect.left;
                        const y = latestY - rect.top;


                        element.style.setProperty(
                            "--mouse-x",
                            `${(x / Math.max(rect.width, 1)) * 100}%`
                        );

                        element.style.setProperty(
                            "--mouse-y",
                            `${(y / Math.max(rect.height, 1)) * 100}%`
                        );


                        frameId = 0;
                    });
                },
                { passive: true }
            );


            element.addEventListener(
                "pointerleave",
                () => {

                    element.style.setProperty(
                        "--mouse-x",
                        "50%"
                    );

                    element.style.setProperty(
                        "--mouse-y",
                        "50%"
                    );
                }
            );
        });
    }


    /* =====================================================
       5. SHARED THEME CONTROLLER
       Un único controlador para las páginas del PAE.
    ===================================================== */

    const themeButton = document.querySelector(".theme-toggle");

    const themeMeta = document.querySelector(
        'meta[name="theme-color"]'
    );


    /* Leer tema guardado */

    function readSavedTheme() {

        try {

            const savedTheme =
                window.localStorage.getItem("pae-theme");

            if (
                savedTheme === "dark" ||
                savedTheme === "light"
            ) {
                return savedTheme;
            }

        } catch (error) {

            console.warn(
                "PAE: No se pudo leer el tema guardado.",
                error
            );
        }

        return root.dataset.theme === "dark"
            ? "dark"
            : "light";
    }


    /* Aplicar tema */

    function setTheme(theme, persist = true) {

        const selectedTheme =
            theme === "dark" ? "dark" : "light";

        const isDark = selectedTheme === "dark";


        /* Cambiar tema del documento */

        root.dataset.theme = selectedTheme;


        /* Actualizar botón */

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


        /* Actualizar color del navegador */

        if (themeMeta) {

            themeMeta.setAttribute(
                "content",
                isDark
                    ? "#0D0C0E"
                    : "#6C1F2F"
            );
        }


        /* Guardar preferencia */

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


    /* Aplicar tema al cargar la página */

    setTheme(readSavedTheme(), false);


    /* Registrar evento del botón */

    if (themeButton) {

        themeButton.addEventListener("click", () => {

            const nextTheme =
                root.dataset.theme === "dark"
                    ? "light"
                    : "dark";

            setTheme(nextTheme, true);
        });
    }


    /* Sincronizar otras pestañas */

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

})();