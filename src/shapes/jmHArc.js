import {jmArc} from "./jmArc.js";
/**
 * 画空心圆弧,继承自jmPath
 *
 * @class jmHArc
 * @extends jmArc
 * @param {object} params 空心圆参数:minRadius=中心小圆半径,maxRadius=大圆半径,start=起始角度,end=结束角度,anticlockwise=false  顺时针，true 逆时针
 */

export default class jmHArc extends jmArc {
		
	constructor(params, t='jmHArc') {
		params.isRegular = true;// 规则的
		params.needCut = true;
		super(params, t);

		this.minRadius = params.minRadius || this.style.minRadius || 0;
		this.maxRadius = params.maxRadius || this.style.maxRadius || 0;
	}

	/**
	 * 设定或获取内空心圆半径
	 * 
	 * @property minRadius
	 * @for jmHArc
	 * @type {number} 
	 */
	get minRadius() {
		return this.property('minRadius');
	}
	set minRadius(v) {
		this.needUpdate = true;
		return this.property('minRadius', v);
	}

	/**
	 * 设定或获取外空心圆半径
	 * 
	 * @property maxRadius
	 * @for jmHArc
	 * @type {number} 
	 */
	get maxRadius() {
		return this.property('maxRadius');
	}
	set maxRadius(v) {
		this.needUpdate = true;
		return this.property('maxRadius', v);
	}

	/**
	 * 初始化图形点
	 *
	 * @method initPoints
	 * @private
	 */
	initPoints() {	
		const location = this.getLocation();	
		//如果设定了半径。则以半径为主
		const minr = this.minRadius;
		const maxr = this.maxRadius;
		
		let start = this.startAngle;
		let end = this.endAngle;
		const anticlockwise = this.anticlockwise;

		//如果是逆时针绘制，则角度为负数，并且结束角为2Math.PI-end
		if(anticlockwise) {
			const p2 =  Math.PI*2;
			start = p2 - start;
			end = p2 - end;
		}

		let step = 0.1;
		if(start > end) step = -step;

		const minps = [];
		const maxps = [];
		//椭圆方程x=a*cos(r) ,y=b*sin(r)
		for(let r=start;;r += step) {
			if(step > 0 && r > end) {
				r = end;
			}
			else if(step < 0 && r < end) {
				r = end;
			}

			const cos = Math.cos(r);
			const sin = Math.sin(r);
			const p1 = {
				x : cos * minr + location.center.x,
				y : sin * minr + location.center.y
			};
			const p2 = {
				x : cos * maxr + location.center.x,
				y : sin * maxr + location.center.y
			};
			minps.push(p1);
			maxps.push(p2);

			if(r === end) break;
		}
		
		maxps.reverse();//大圆逆序
		if(!this.style || !this.style.close) {
			maxps[0].m = true;//开始画大圆时表示为移动
		}		
		this.points = minps.concat(maxps);
	}
}

export { jmHArc };