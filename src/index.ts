(() => {
    const ingredientesComunes: string[] = [
        'Tomate', 'Cebolla', 'Ajo', 'Pimiento', 'Zanahoria', 'Patata', 'Arroz', 'Pasta',
        'Pollo', 'Cerdo', 'Ternera', 'Carne', 'Pescado', 'Mariscos', 'Huevos', 'Leche', 'Queso', 'Pan', 'Aceite de oliva',
        'Limón', 'Manzana', 'Plátano', 'Frijoles', 'Lentejas','Garbanzos', 'Espinacas', 'Brócoli'
    ];

    const ingredienteInput = document.getElementById('ingrediente') as HTMLInputElement;
    const sugerenciasDiv = document.getElementById('sugerencias') as HTMLDivElement;
    const ingredientesSeleccionadosDiv = document.getElementById('ingredientes-seleccionados') as HTMLDivElement;
    const generarRecetaBtn = document.getElementById('generarReceta') as HTMLButtonElement;
    const recetaDiv = document.getElementById('receta') as HTMLDivElement;
    const recetasAnterioresDiv = document.createElement('div') as HTMLDivElement;
    recetasAnterioresDiv.id = 'recetas-anteriores';
    recetaDiv.parentNode!.insertBefore(recetasAnterioresDiv, recetaDiv.nextSibling);

    let ingredientesSeleccionados: string[] = [];
    let recetasAnteriores: string[] = [];

    cargarDatosGuardados();

    ingredienteInput.addEventListener('input', mostrarSugerencias);
    ingredienteInput.addEventListener('keypress', manejarTeclaPresionada);
    sugerenciasDiv.addEventListener('click', seleccionarIngrediente);
    generarRecetaBtn.addEventListener('click', generarReceta);

    function cargarDatosGuardados() {
        const ingredientesGuardados = localStorage.getItem('ingredientesSeleccionados');
        if (ingredientesGuardados) {
            ingredientesSeleccionados = JSON.parse(ingredientesGuardados);
            actualizarIngredientesSeleccionados();
        }

        const recetasGuardadas = localStorage.getItem('recetasAnteriores');
        if (recetasGuardadas) {
            recetasAnteriores = JSON.parse(recetasGuardadas);
            mostrarRecetasAnteriores();
        }
    }

    function guardarDatos() {
        localStorage.setItem('ingredientesSeleccionados', JSON.stringify(ingredientesSeleccionados));
        localStorage.setItem('recetasAnteriores', JSON.stringify(recetasAnteriores));
    }

    function mostrarSugerencias(): void {
        const input = ingredienteInput.value.toLowerCase();
        const sugerencias = ingredientesComunes.filter(ingrediente => 
            ingrediente.toLowerCase().startsWith(input)
        );

        sugerenciasDiv.innerHTML = '';
        sugerencias.forEach(sugerencia => {
            const div = document.createElement('div');
            div.textContent = sugerencia;
            div.classList.add('sugerencia');
            sugerenciasDiv.appendChild(div);
        });

        if (input && !sugerencias.some(s => s.toLowerCase() === input)) {
            const div = document.createElement('div');
            div.textContent = `Añadir "${ingredienteInput.value}"`;
            div.classList.add('sugerencia', 'sugerencia-personalizada');
            sugerenciasDiv.appendChild(div);
        }
    }

    function manejarTeclaPresionada(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            const ingredientePersonalizado = ingredienteInput.value.trim();
            if (ingredientePersonalizado) {
                agregarIngrediente(ingredientePersonalizado);
            }
        }
    }

    function seleccionarIngrediente(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sugerencia')) {
            let ingrediente: string | null = null;
            if (target.classList.contains('sugerencia-personalizada')) {
                ingrediente = ingredienteInput.value.trim();
            } else {
                ingrediente = target.textContent;
            }
            if (ingrediente) {
                agregarIngrediente(ingrediente);
            }
        }
    }

    function agregarIngrediente(ingrediente: string) {
        if (!ingredientesSeleccionados.includes(ingrediente)) {
            ingredientesSeleccionados.push(ingrediente);
            actualizarIngredientesSeleccionados();
            guardarDatos();
        }
        ingredienteInput.value = '';
        sugerenciasDiv.innerHTML = '';
    }

    function actualizarIngredientesSeleccionados() {
        ingredientesSeleccionadosDiv.innerHTML = '';
        ingredientesSeleccionados.forEach(ingrediente => {
            const div = document.createElement('div');
            div.classList.add('ingrediente');
            div.innerHTML = `
                ${ingrediente}
                <span class="eliminar" data-ingrediente="${ingrediente}">&times;</span>
            `;
            ingredientesSeleccionadosDiv.appendChild(div);
        });

        document.querySelectorAll('.eliminar').forEach(btn => {
            btn.addEventListener('click', eliminarIngrediente);
        });
    }

    function eliminarIngrediente(e: Event) {
        const target = e.target as HTMLElement;
        const ingrediente = target.getAttribute('data-ingrediente');
        if (ingrediente) {
            ingredientesSeleccionados = ingredientesSeleccionados.filter(i => i !== ingrediente);
            actualizarIngredientesSeleccionados();
            guardarDatos();
        }
    }

    async function generarReceta(): Promise<void> {
        if (ingredientesSeleccionados.length === 0) {
            alert('Por favor, selecciona al menos un ingrediente.');
            return;
        }

        recetaDiv.innerHTML = 'Generando receta...';
        
        const prompt = `Eres un chef que sugiere recetas prácticas y deliciosas basadas en ingredientes disponibles. Puedes asumir que ingredientes básicos como sal, pimienta, aceite, agua y condimentos comunes están disponibles sin que el usuario los mencione.

Sugiere una receta coherente y sabrosa utilizando algunos de estos ingredientes: ${ingredientesSeleccionados.join(', ')}. No es necesario usar todos los ingredientes mencionados, prioriza crear una receta que tenga sentido. Puedes incluir ingredientes básicos comunes aunque no se mencionen. Proporciona el nombre de la receta, una lista de ingredientes necesarios con cantidades aproximadas (en gramos, mililitros, vasos, cucharadas, etc) y su preparación individual en caso de que sea necesario, y las instrucciones de la receta paso a paso.`;

        try {
            const response = await fetch('/generate-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const recetaGenerada = data.candidates[0].content.parts[0].text;
                recetaDiv.innerHTML = recetaGenerada;
                guardarReceta(recetaGenerada);
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                recetaDiv.innerHTML = `La generación de la receta fue bloqueada. Razón: ${data.promptFeedback.blockReason}`;
            } else {
                recetaDiv.innerHTML = 'No se pudo generar una receta. Por favor, intenta de nuevo.';
            }
        } catch (error) {
            console.error('Error detallado:', error);
            recetaDiv.innerHTML = 'Error al generar la receta. Por favor, intenta de nuevo.';
        }
    }

    function guardarReceta(receta: string) {
        recetasAnteriores.unshift(receta);
        if (recetasAnteriores.length > 5) {
            recetasAnteriores.pop();
        }
        guardarDatos();
        mostrarRecetasAnteriores();
    }

    function mostrarRecetasAnteriores() {
        recetasAnterioresDiv.innerHTML = '<h2>Recetas Anteriores</h2>';
        recetasAnteriores.forEach((receta, index) => {
            const recetaResumen = receta.split('\n')[0]; // Asumimos que la primera línea es el título
            const recetaElemento = document.createElement('div');
            recetaElemento.innerHTML = `<p>${index + 1}. ${recetaResumen} <button class="ver-receta" data-index="${index}">Ver</button></p>`;
            recetasAnterioresDiv.appendChild(recetaElemento);
        });

        document.querySelectorAll('.ver-receta').forEach(btn => {
            btn.addEventListener('click', mostrarRecetaAnterior);
        });
    }

    function mostrarRecetaAnterior(e: Event) {
        const target = e.target as HTMLElement;
        const index = target.getAttribute('data-index');
        if (index !== null) {
            recetaDiv.innerHTML = recetasAnteriores[parseInt(index)];
        }
    }
})();
