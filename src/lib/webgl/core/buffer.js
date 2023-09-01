
// 创建缓冲区
function createBuffer(gl, data, type=gl.ARRAY_BUFFER, drawType=gl.STATIC_DRAW) {
    //先创建一个缓存对象
    const buffer = gl.createBuffer();
    //说明缓存对象保存的类型
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    //写入坐标数据
    // 因为会将数据发送到 GPU，为了省去数据解析，这里使用 Float32Array 直接传送数据
    gl.bufferData(type, data, drawType); // 表示缓冲区的内容不会经常更改
    return {
        type,
        drawType,
        buffer,
        // 获取到数组中单个元素的字节数
        unitSize: data.BYTES_PER_ELEMENT
    };
}

// 创建float32的buffer
function createFloat32Buffer(gl, data, type=gl.ARRAY_BUFFER, drawType=gl.STATIC_DRAW) {
    const vertices = new Float32Array(data);
    const buffer = createBuffer(gl, vertices, type, drawType);
    return buffer;
}

// 释放
function deleteBuffer(gl, buffer) {
    gl.deleteBuffer(buffer.buffer || buffer);
}


export {
    createBuffer,
    createFloat32Buffer,
    deleteBuffer,
}