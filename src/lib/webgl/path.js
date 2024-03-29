import WebglBase from './base.js';

// path 绘制类
class WebglPath extends WebglBase {
    constructor(graph, option) {
        super(graph, option);
        // 是否是规则的，不规则的处理方式更为复杂和耗性能
        this.isRegular = option.isRegular || false;
        this.needCut = option.needCut || false;
        this.control = option.control;
        this.points = [];
    }

    setParentBounds(parentBounds = this.parentAbsoluteBounds) {

        //this.useProgram();

        if(parentBounds) this.parentAbsoluteBounds = parentBounds;
        // 写入当前canvas大小
        this.context.uniform2f(this.program.uniforms.a_center_point.location, this.graph.width / 2, this.graph.height / 2);
    }

    setFragColor(color) {
        
        if(!Array.isArray(color)) {
            color = this.convertColor(color);
            if(typeof color.a === 'undefined') color.a = 1;
            this.context.uniform4f(this.program.uniforms.v_single_color.location, color.r, color.g, color.b, color.a * this.style.globalAlpha);
            return null;
        }

        const colorData = [];
        for(let c of color) {
            c = this.convertColor(c);
            if(typeof c.a === 'undefined') c.a = 1;
            colorData.push(c.r, c.g, c.b, c.a * this.style.globalAlpha);
        }
        
        const colorBuffer = this.createFloat32Buffer(colorData); 
        this.writeVertexAttrib(colorBuffer, this.program.attrs.a_color, 4, 0, 0);
        colorBuffer.attr = this.program.attrs.a_color;
        return colorBuffer;
    }

    beginDraw() {
        this.useProgram();
    }

    // 开始绘制
    draw(points, parentBounds = this.parentAbsoluteBounds) {
        //this.useProgram();

        this.setParentBounds(parentBounds);
        
        this.points = points;
    }

    endDraw() {
        if(this.points) delete this.points;
        if(this.pathPoints) delete this.pathPoints;
    }

    // 图形封闭
    closePath() {
        if(this.points && this.points.length > 2 && this.points[0] !== this.points[this.points.length-1]) {
            const start = this.points[0];
            const end = this.points[this.points.length-1];
            if(start != end && !(start.x === end.x && start.y === end.y)) this.points.push(start);
        }
    }

    // 绘制点数组
    writePoints(points, attr = this.program.attrs.a_position) {
       
        const fixedPoints = [];
        for(const p of points) {
            fixedPoints.push(
                p.x + this.parentAbsoluteBounds.left,
                p.y + this.parentAbsoluteBounds.top
            );
        }
        const vertexBuffer = this.createFloat32Buffer(fixedPoints); 
        this.writeVertexAttrib(vertexBuffer, attr, 2, 0, 0);
        vertexBuffer.attr = attr;
        return vertexBuffer;
    }

    // 连接二个点
    genLinePoints(start, end) {
        const points = [start];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if(dx !== 0 || dy !== 0) {
            const len = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            const cos = dx / len;
            const sin = dy / len;
            const step = 0.5;
            for(let l=step; l<len; l+=step) {
                const x = start.x + cos * l;
                const y = start.y + sin * l;
                points.push({
                    x, 
                    y
                });
            }
        }
        points.push(end);
        return points;
    }

    // 把path坐标集合分解成一个个点，并且处理moveTo线段能力
    pathToPoints(points=this.points) {
        let start = null;
        const res = [];
        for(let i=0; i<points.length; i++) {
            const p = points[i];
            if(start && !p.m) {
                const linePoints = this.genLinePoints(start, p);
                res.push(...linePoints);
            }
            else if(start && !res.includes(start)) {
                res.push(start);
            }
            start = p;
        }
        if(!res.includes(start)) res.push(start);
        return res;
    }
    // 二点是否重合
    equalPoint(p1, p2) {
        return p1.x === p2.x && p1.y === p2.y;
    }
    // 把path坐标集合转为线段集
    pathToLines(points) {
        let start = null;
        const res = [];
        for(let i=0; i<points.length; i++) {
            const p = points[i];
            // 不重合的二个点，组成线段
            if(start && !p.m && !(start.x == p.x && start.y == p.y)) {
                const line = {
                    start,
                    end: p,
                };
                res.push(line);
            }
            start = p;
        }
        return res;
    }

    // 裁剪线段，如果二段线段有交点，则分割成四段， 端头相交的线段不用分割
    cutLines(lines, index1=0, index2=0) {
        if(lines && lines.length < 3) return lines;
        
        index2 = Math.max(index1 + 1, index2); //如果指定了比下一个更大的索引，则用更大的，说明前面的已经处理过了，不需要重复

        // 找出线段相交的点，并切割线段
        while(index1 < lines.length) {
            const line1 = lines[index1];

            while(index2 < lines.length) {
                const line2 = lines[index2];
                // 如果二条线顶点有重合，则不用处理
                if(this.equalPoint(line1.start, line2.start) || this.equalPoint(line1.end, line2.end) || 
                this.equalPoint(line1.start, line2.end) || this.equalPoint(line1.end, line2.start)) {
                    index2++;
                    continue;
                }
                let cuted = false;
                const intersection = this.getIntersection(line1, line2);// 计算交点
                if(intersection) {
                    // 如果交点不是线段的端点，则分割成二条线段
                    if(!this.equalPoint(line1.start, intersection) && !this.equalPoint(line1.end, intersection)) {
                        const sub1 = {
                            start: line1.start,
                            end: intersection
                        };
                        const sub2 = {
                            start: intersection,
                            end: line1.end
                        };
                        // 从原数组中删除当前线段，替换成新的线段
                        lines.splice(index1, 1, sub1, sub2);
                        // 当前线段被重新替换，需要重新从它开始处理
                        cuted = true;
                        index2 ++;// 因为多加入了一个线段，则对比线索引需要加1
                    }
                    // 如果交点不是线段的端点，则分割成二条线段
                    if(!this.equalPoint(line2.start, intersection) && !this.equalPoint(line2.end, intersection)) {
                        const sub1 = {
                            start: line2.start,
                            end: intersection
                        };
                        const sub2 = {
                            start: intersection,
                            end: line2.end
                        };
                        // 从原数组中删除当前线段，替换成新的线段
                        lines.splice(index2, 1, sub1, sub2);
                        index2 ++; // 线段2也切成了二段，对比索引要继续加1
                    }
                }
                index2++;
                // 如果已经分割了起始线段，则第一个子线段开始，重新对比后面还未对比完的。直接所有对比完成返回
                if(cuted) return this.cutLines(lines, index1, index2);
            }
            index1++;
            index2 = index1 + 1;
        }
        return lines;
    }

    // 计算二个线段的交点
    getIntersection(line1, line2) {
        // 如果首尾相接，也认为是有交点
        if(this.equalPoint(line1.start, line2.start) || this.equalPoint(line1.start, line2.end)) return line1.start;
        if(this.equalPoint(line1.end, line2.start) || this.equalPoint(line1.end, line2.end)) return line1.end;

        // 三角形abc 面积的2倍
        const area_abc = (line1.start.x - line2.start.x) * (line1.end.y - line2.start.y) - (line1.start.y - line2.start.y) * (line1.end.x - line2.start.x);
        
        // 三角形abd 面积的2倍
        const area_abd = (line1.start.x - line2.end.x) * (line1.end.y - line2.end.y) - (line1.start.y - line2.end.y) * (line1.end.x - line2.end.x);
        
        // 面积符号相同则两点在线段同侧,不相交 (=0表示在线段顶点上);
        if (area_abc * area_abd > 0) {
            return null;
        }
        
        // 三角形cda 面积的2倍
        const area_cda = (line2.start.x - line1.start.x) * (line2.end.y - line1.start.y) - (line2.start.y - line1.start.y) * (line2.end.x - line1.start.x);
        // 三角形cdb 面积的2倍
        // 注意: 这里有一个小优化.不需要再用公式计算面积,而是通过已知的三个面积加减得出.
        const area_cdb = area_cda + area_abc - area_abd ;
        if(area_cda * area_cdb > 0) {
            return null ;
        }
        if(area_abd === area_abc) return null;

        //计算交点坐标
        const t = area_cda / (area_abd - area_abc);
        const dx= t * (line1.end.x - line1.start.x);
        const dy= t * (line1.end.y - line1.start.y);

        return { 
            x: line1.start.x + dx, 
            y: line1.start.y + dy
        };
    }

    // 找出跟当前线段尾部相交的所有线段
    getIntersectionLines(line, lines, index, point=line.end, points=[], root=null) {
        const res = {
            line,
            polygons: []
        };
        
        points.push(point);
        
        if(root && this.equalPoint(root.line.start, point)) {
            points.unshift(root.line.start); // 把起始地址加入进去
            root.polygons.push(points);
            return res;
        }

        for(;index<lines.length; index++) {
            const l = lines[index];
            if(this.equalPoint(point, l.start)) {      
                if(points.includes(l.end)) continue;          
                this.getIntersectionLines(l, lines, index+1, l.end, [...points], root||res);
            }
            else if(this.equalPoint(point, l.end)) {
                if(points.includes(l.start)) continue;     
                this.getIntersectionLines(l, lines, index+1, l.start, [...points], root||res);
            }
        }
        return res;
    }

    // 根据路径点坐标，切割出封闭的多边形
    getPolygon(points) {
        let polygons = [];
        let lines = this.pathToLines(points); // 分解得到线段
        if(lines && lines.length > 2) {
            lines = this.cutLines(lines); // 把所有相交点切割线段找出来
            for(let i=0; i<lines.length-1; i++) {
                const line1 = lines[i];
                let polygon = [];// 当前图形

                const treeLine = this.getIntersectionLines(line1, lines, i+1);
                
                if(treeLine.polygons.length) polygons.push(...treeLine.polygons);
                continue;
                let lastLine = line1; // 下一个还在连接状态的线
                for(let j=i+1; j<lines.length; j++) {
                    const line2 = lines[j];
                    // 如果跟下一条线相接，则表示还在形成图形中
                    if(this.equalPoint(lastLine.end, line2.start)) {
                        polygon.push(lastLine.end);
                        lastLine = line2;
                        if(i === j+1) continue; //下一条相连 则不需要处理相交情况
                    }
                    else {
                        polygon = [];
                    }  
                    // 因为前面进行了分割线段，则里只有处理端点相连的情况
                    const intersection = this.equalPoint(line1.start, line2.end)? line1.start: null;//this.getIntersection(line1, line2);// 计算交点
                    if(intersection) {
                        polygon.push(intersection);// 交叉点为图形顶点
                        // 如果上一个连接线不是当前交叉线，则表示重新开始闭合
                        // 如果上一个连接线是当前交叉线，形成了封闭的图形
                        if(lastLine === line2 && polygon.length > 1) {
                            polygons.push(polygon);
                            
                            // 封闭后，下一个起始线条就是从交点开始计算起
                            /*lastLine = {
                                start: intersection,
                                end: line2.end
                            };*/
                            polygon = [];// 重新开始新一轮找图形

                            /*
                            // 如果交点是上一条线的终点，则新图形为空
                            if(this.equalPoint(line2.end, intersection)) {
                                polygon = [];// 重新开始新一轮找图形
                            }
                            else {
                                // 同时交点也要加到上一个图形中第一个点，形成封闭
                                polygon.unshift(intersection);

                                polygon = [ intersection ];// 重新开始新一轮找图形
                            }*/
                        }
                        else {
                            lastLine = line2;
                        }
                    }
                }
            }
        }
        
        // 当有多个封闭图形时，再弟归一下，里面是不是有封闭图形内还有子封闭图形
        /*if(polygons.length > 1) {
            const newPolygons = [];
            for(const polygon of polygons) {
                // 只有大于4才有可能有子封闭图形
                if(polygon.length > 4) {
                    const childPolygons = this.getPolygon(polygon);
                    // 当有多个子图形时，表示它不是最终封闭图形，跳过，
                    // 因为它的子图形之前有加入的，不需要重复加入
                    if(childPolygons.length > 1) {
                        //newPolygons.push(...childPolygons);
                        continue;
                    }
                }
                newPolygons.push(polygon);
            }
            polygons = newPolygons;
        }*/
        return polygons;
    }

    // 分割成一个个规则的三角形，不规则的多边形不全割的话纹理就会没法正确覆盖
    getTriangles(points) {
        
        //this.trianglesCache = this.trianglesCache||(this.trianglesCache={});
        //const key = JSON.stringify(points);
        //if(this.trianglesCache[key]) return this.trianglesCache[key];

        const res = [];
        const polygons = this.getPolygon(points);                
        if(polygons.length) {            
            for(const polygon of polygons) {
                // 需要分割三角形，不然填充会有问题
                const triangles = this.earCutPointsToTriangles(polygon);
                res.push(...triangles);
            }   
        }
        //this.trianglesCache[key] = res;
        return res;
    }

    // 画线条
    stroke(points = this.points, color = this.style.strokeStyle, lineWidth = this.style.lineWidth) {
        if(!points || !points.length) return;
       // this.useProgram();

        let colorBuffer = null;
        if(color) {
            colorBuffer = this.setFragColor(color);
        }
        // 线宽
        if(lineWidth) {
            this.context.uniform1f(this.program.uniforms.a_point_size.location, lineWidth);// * this.graph.devicePixelRatio
        }
        // 标注为stroke
        if(this.program.uniforms.a_type) {
            // 4表示单画一个圆点，1表示方块形成的线条
            this.context.uniform1i(this.program.uniforms.a_type.location, points.length === 1? 4 :1);
        }
        if(points && points.length) {
            const regular = lineWidth <= 1.2;
            points = regular? points : this.pathToPoints(points);
            const buffer = this.writePoints(points);
            this.context.drawArrays(regular? this.context.LINE_LOOP: this.context.POINTS, 0, points.length);
            this.deleteBuffer(buffer);
        }
        colorBuffer && this.deleteBuffer(colorBuffer);
        colorBuffer && this.disableVertexAttribArray(colorBuffer.attr);
    }

    // 填充图形
    fill(bounds = {left: 0, top: 0, width: 0, height: 0}, type = 1) {
       
        if(this.points && this.points.length) {            
            // 如果是颜色rgba
            if(this.style.fillStyle) {            
                this.fillColor(this.style.fillStyle, this.points, bounds, type);
            }
            if(this.style.fillImage) {            
                this.fillImage(this.style.fillImage, this.points, bounds, type); 
            }
        }
    }

    fillColor(color, points, bounds, type=1) {
        
        // 如果是渐变色，则需要计算偏移量的颜色
        if(this.isGradient(color)) {
            const imgData = color.toImageData(this, bounds, points);
            return this.fillImage(imgData.data, imgData.points, bounds);
        }
        
        // 标注为fill
        this.context.uniform1i(this.program.uniforms.a_type.location, type);
        const colorBuffer = this.setFragColor(color);

        this.fillPolygons(points);                

        colorBuffer && this.deleteBuffer(colorBuffer);
        colorBuffer && this.disableVertexAttribArray(colorBuffer.attr);

    }

    // 区域填充图片
    // points绘制的图形顶点
    // 图片整体绘制区域
    fillImage(img, points, bounds) {
        if(!img) return;

        // 设置纹理
        const texture = img instanceof ImageData? this.createDataTexture(img) : this.createImgTexture(img);
        this.context.uniform1i(this.program.uniforms.u_sample.location, 0); // 纹理单元传递给着色器

        // 指定纹理区域尺寸
        this.context.uniform4f(this.program.uniforms.v_texture_bounds.location, 
            bounds.left + this.parentAbsoluteBounds.left,
            bounds.top + this.parentAbsoluteBounds.top,
            bounds.width,
            bounds.height,
        ); // 纹理单元传递给着色器

        this.fillTexture(points);
        
        this.deleteTexture(texture);
    }

    fillTexture(points) {        
        if(points && points.length) {  // 标注为纹理对象
            this.context.uniform1i(this.program.uniforms.a_type.location, 2);  
            // 纹理坐标
            //const coordBuffer = this.writePoints(points, this.program.attrs.a_text_coord);
            this.fillPolygons(points, true);
            //this.deleteBuffer(coordBuffer);  
            this.disableVertexAttribArray(this.program.attrs.a_text_coord);   
        } 
    }

    // 进行多边形填充
    fillPolygons(points, isTexture = false) {   
        //const indexBuffer = this.createUint16Buffer(triangles, this.context.ELEMENT_ARRAY_BUFFER);
        //this.context.drawElements(this.context.TRIANGLES, triangles.length, this.context.UNSIGMED_SHORT, 0);
        //this.deleteBuffer(indexBuffer);
        /*if(points.length > 3 && (!regular || this.needCut)) {
            const triangles = regular && this.needCut? this.earCutPointsToTriangles(points): this.getTriangles(points);                
            if(triangles.length) {   
                for(const triangle of triangles) {
                    this.fillPolygons(triangle, isTexture);// 这里就变成了规则的图形了
                }
            }
        }
        else {*/
            const buffer = this.writePoints(points);
            // 纹理坐标
            const coordBuffer = isTexture? this.writePoints(points, this.program.attrs.a_text_coord): null;

            this.context.drawArrays(this.context.TRIANGLE_FAN, 0, points.length);
            this.deleteBuffer(buffer);
            coordBuffer && this.deleteBuffer(coordBuffer);    
        //}
    }

    // 填充图形
    drawImage(img, left=0, top=0, width=img.width, height=img.height) {
        width = width || img.width;
        height = height || img.height;

        this.fillImage(img, this.points, {
            left,
            top,
            width, 
            height
        });
    }

    drawText(text, x, y, bounds) {
        let canvas = this.textureCanvas;
        if(!canvas) {
            return null;
        }
        canvas.width = bounds.width;
        canvas.height = bounds.height;

        if(!canvas.width || !canvas.height) {
            return null;
        }

        this.textureContext.clearRect(0, 0, canvas.width, canvas.height);
        // 修改字体
		this.textureContext.font = this.style.font || (this.style.fontSize + 'px ' + this.style.fontFamily);

        x -= bounds.left;
        y -= bounds.top;

        this.setTextureStyle(this.style);

        if(this.style.fillStyle && this.textureContext.fillText) {

            if(this.style.maxWidth) {
                this.textureContext.fillText(text, x, y, this.style.maxWidth);
            }
            else {
                this.textureContext.fillText(text, x, y);
            }
        }
        if(this.textureContext.strokeText) {

            if(this.style.maxWidth) {
                this.textureContext.strokeText(text, x, y, this.style.maxWidth);
            }
            else {
                this.textureContext.strokeText(text, x, y);
            }
        }
        // 用纹理图片代替文字
        const data = this.textureContext.getImageData(0, 0, canvas.width, canvas.height);
        this.fillImage(data, this.points, bounds);
    }
}

export default WebglPath;