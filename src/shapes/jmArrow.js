import {jmPath} from "../core/jmPath.js";
import {jmUtils} from "../core/jmUtils.js";
/**
 * 画箭头,继承自jmPath
 *
 * @class jmArrow
 * @extends jmPath
 * @param {object} 生成箭头所需的参数
 */
export default class jmArrow extends jmPath {	

	constructor(params, t='jmArrow') {
		super(params, t);
		this.style.lineJoin = 'miter';
		this.style.lineCap = 'square';

		this.angle = params.angle  || 0;
		this.start = params.start  || {x:0,y:0};
		this.end = params.end  ||  {x:0,y:0};
		this.offsetX = params.offsetX || 5;
		this.offsetY = params.offsetY || 8;
	}

	/**
	 * 控制起始点
	 *
	 * @property start
	 * @for jmArrow
	 * @type {point}
	 */
	get start() {
		return this.property('start');
	}
	set start(v) {
		this.needUpdate = true;
		return this.property('start', v);
	}

	/**
	 * 控制结束点
	 *
	 * @property end
	 * @for jmArrow
	 * @type {point} 结束点
	 */
	get end() {
		return this.property('end');
	}
	set end(v) {
		this.needUpdate = true;
		return this.property('end', v);
	}

	/**
	 * 箭头角度
	 *
	 * @property angle
	 * @for jmArrow
	 * @type {number} 箭头角度
	 */
	get angle() {
		return this.property('angle');
	}
	set angle(v) {
		this.needUpdate = true;
		return this.property('angle', v);
	}

	/**
	 * 箭头X偏移量
	 *
	 * @property offsetX
	 * @for jmArrow
	 * @type {number}
	 */
	get offsetX() {
		return this.property('offsetX');
	}
	set offsetX(v) {
		this.needUpdate = true;
		return this.property('offsetX', v);
	}

	/**
	 * 箭头Y偏移量
	 *
	 * @property offsetY
	 * @for jmArrow
	 * @type {number}
	 */
	get offsetY() {
		return this.property('offsetY');
	}
	set offsetY(v) {
		this.needUpdate = true;
		return this.property('offsetY', v);
	}

	/**
	 * 初始化图形点
	 * 
	 * @method initPoint
	 * @private
	 * @param {boolean} solid 是否为实心的箭头
	 * @for jmArrow
	 */
	initPoints(solid) {	
		let rotate = this.angle;
		let start = this.start;
		let end = this.end;
		if(!end) return;
		//计算箭头指向角度
		if(!rotate) {
			rotate = Math.atan2(end.y - start.y,end.x - start.x);
		}
		this.points = [];
		let offx = this.offsetX;
		let offy = this.offsetY;
		//箭头相对于线的偏移角度
		let r = Math.atan2(offx,offy);
		let r1 = rotate + r;
		let rsin = Math.sin(r1);
		let rcos = Math.cos(r1);
		let sq = Math.sqrt(offx * offx  + offy * offy);
		let ystep = rsin * sq;
		let xstep = rcos * sq;
		
		let p1 = {
			x:end.x - xstep,
			y:end.y - ystep
		};
		let r2 = rotate - r;
		rsin = Math.sin(r2);
		rcos = Math.cos(r2);
		ystep = rsin * sq;
		xstep = rcos * sq;
		let p2 = {
			x:end.x - xstep,
			y:end.y - ystep
		};

		let s = jmUtils.clone(end);  
		s.m = true;  
		this.points.push(s);
		this.points.push(p1);
		//如果实心箭头则封闭路线
		if(solid || this.style.fill) {    	
			this.points.push(p2);
			this.points.push(end);
		}
		else {
			this.points.push(s);
			this.points.push(p2);
		}		
		return this.points;
	}

}

export { jmArrow };