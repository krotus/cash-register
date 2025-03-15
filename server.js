const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware para parsear JSON en peticiones
app.use(express.json());

// Servir archivos estáticos en /public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para obtener la base de datos desde db.json
function readDatabase() {
    const dataPath = path.join(__dirname, 'data', 'db.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
}

// Guardar datos en db.json
function writeDatabase(db) {
    const dataPath = path.join(__dirname, 'data', 'db.json');
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2), 'utf8');
}

// ================== RUTAS ================== //

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    const db = readDatabase();
    res.json(db.productos);
});

// Crear nuevo producto
app.post('/api/productos', (req, res) => {
    const { nombre, precio } = req.body;
    const db = readDatabase();
    const nuevoProducto = {
        id: Date.now(), // ID sencillo
        nombre,
        precio: parseFloat(precio)
    };
    db.productos.push(nuevoProducto);
    writeDatabase(db);
    res.json(nuevoProducto);
});

// Actualizar un producto (PUT)
app.put('/api/productos/:id', (req, res) => {
    const db = readDatabase();
    const { id } = req.params;
    const { nombre, precio } = req.body;

    // Convertir a número (en caso de que venga como string)
    const productoId = parseInt(id, 10);

    // Buscar el producto en la lista
    const index = db.productos.findIndex((p) => p.id === productoId);
    if (index === -1) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Actualizar campos (nombre y/o precio)
    if (nombre !== undefined) {
        db.productos[index].nombre = nombre;
    }
    if (precio !== undefined) {
        db.productos[index].precio = parseFloat(precio);
    }

    writeDatabase(db);
    return res.json(db.productos[index]);
});

// Borrar un producto (DELETE)
app.delete('/api/productos/:id', (req, res) => {
    const db = readDatabase();
    const { id } = req.params;
    const productoId = parseInt(id, 10);

    // Buscar el producto
    const index = db.productos.findIndex((p) => p.id === productoId);
    if (index === -1) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Eliminarlo del array
    const productoEliminado = db.productos.splice(index, 1);
    writeDatabase(db);

    // Devolver el producto eliminado o un mensaje de confirmación
    return res.json({ message: 'Producto eliminado', producto: productoEliminado });
});

// Registrar un pedido
app.post('/api/pedidos', (req, res) => {
    // Datos esperados: lista de productos (id, cantidad),
    // total, metodoPago, importeEntregado, cambio
    const { productos, total, metodoPago, importeEntregado, cambio } = req.body;
    const db = readDatabase();

    const nuevoPedido = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        productos,
        total,
        metodoPago,
        importeEntregado,
        cambio
    };

    db.pedidos.push(nuevoPedido);
    writeDatabase(db);
    res.json(nuevoPedido);
});

// Obtener historial de pedidos
app.get('/api/pedidos', (req, res) => {
    const db = readDatabase();
    res.json(db.pedidos);
});

// Ruta para obtener estadísticas de pedidos
app.get('/api/estadisticas', (req, res) => {
    const db = readDatabase();
    const pedidos = db.pedidos;

    let { desde, hasta } = req.query;
    // Si vienen vacíos, usar un rango amplio
    if (!desde) desde = '1970-01-01';
    if (!hasta) hasta = '2999-12-31';

    const pedidosFiltrados = pedidos.filter(p => {
        const fechaPedido = new Date(p.fecha);
        return fechaPedido >= new Date(desde) && fechaPedido <= new Date(hasta);
    });

    // 1) Contar cuántos pedidos hay
    const totalPedidos = pedidos.length;

    // 2) Calcular el total de ingresos acumulados
    const totalIngresos = pedidos.reduce((acc, pedido) => acc + pedido.total, 0);

    // 3) Top productos más vendidos (por unidades)
    // Estructura: { nombreProducto: totalUnidadesVendidas }
    const contadorProductos = {};
    pedidos.forEach(pedido => {
        pedido.productos.forEach(prod => {
            if (!contadorProductos[prod.nombre]) {
                contadorProductos[prod.nombre] = 0;
            }
            contadorProductos[prod.nombre] += prod.cantidad;
        });
    });
    // Convertir a array y ordenar
    const topProductosPorCantidad = Object.keys(contadorProductos)
        .map(nombre => ({ nombre, cantidad: contadorProductos[nombre] }))
        .sort((a, b) => b.cantidad - a.cantidad);

    // 4) Top productos por facturación
    // Similar al anterior, pero multiplicando cantidad * precio
    const contadorFacturacion = {};
    pedidos.forEach(pedido => {
        pedido.productos.forEach(prod => {
            if (!contadorFacturacion[prod.nombre]) {
                contadorFacturacion[prod.nombre] = 0;
            }
            contadorFacturacion[prod.nombre] += prod.cantidad * prod.precio;
        });
    });
    const topProductosPorFacturacion = Object.keys(contadorFacturacion)
        .map(nombre => ({ nombre, facturacion: contadorFacturacion[nombre] }))
        .sort((a, b) => b.facturacion - a.facturacion);

    // 5) Agrupar por fecha para ver total diario, por ejemplo
    // Creamos un objeto { '2025-03-10': totalDia, '2025-03-11': totalDia, ... }
    const ventasPorDia = {};
    pedidos.forEach(pedido => {
        const fecha = new Date(pedido.fecha);
        // Tomar solo YYYY-MM-DD
        const clave = fecha.toISOString().split('T')[0];
        if (!ventasPorDia[clave]) {
            ventasPorDia[clave] = 0;
        }
        ventasPorDia[clave] += pedido.total;
    });
    // Convertimos el objeto en un array ordenado por fecha
    const ventasDiariasArray = Object.keys(ventasPorDia)
        .map(fecha => ({ fecha, total: ventasPorDia[fecha] }))
        .sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

    // Devolvemos todo en un objeto
    res.json({
        totalPedidos,
        totalIngresos,
        topProductosPorCantidad,
        topProductosPorFacturacion,
        ventasDiarias: ventasDiariasArray
    });
});


// =========================================== //

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
