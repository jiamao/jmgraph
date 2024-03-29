import {jmRect} from "./jmRect.js";
/**
 * 可拉伸的缩放控件
 * 继承jmRect
 * 如果此控件加入到了当前控制的对象的子控件中，请在参数中加入movable:false，否则导致当前控件会偏离被控制的控件。
 *
 * @class jmResize
 * @extends jmRect
 */
export default class jmResize extends jmRect {	

	constructor(params, t='jmResize') {
		params = params || {};
		params.isRegular = true;// 规则的
		
		super(params, t);
		//是否可拉伸
		this.resizable = params.resizable === false?false:true;	
		this.movable = params.movable;
		this.rectSize = params.rectSize || 8;
		this.style.close = this.style.close || true;

		// 方块鼠标指针方向
		this.rectCursors = ['w-resize','nw-resize','n-resize','ne-resize','e-resize','se-resize','s-resize','sw-resize'];

		this.init(params);
	}
	/**
	 * 拉动的小方块大小
	 * @property rectSize
	 * @type {number}
	 */
	get rectSize() {
		return this.property('rectSize');
	}
	set rectSize(v) {
		return this.property('rectSize', v);
	}

	/**
	 * 是否可以拉大缩小
	 * @property resizable
	 * @type {boolean}
	 */
	get resizable() {
		return this.property('resizable');
	}
	set resizable(v) {
		return this.property('resizable', v);
	}

	/**
	 * 初始化控件的8个拉伸方框
	 *
	 * @method init
	 * @private
	 */
	init(params) {
		//如果不可改变大小。则直接退出
		if(this.resizable === false) return;
		this.resizeRects = [];	
		let rs = this.rectSize;
		let rectStyle = this.style.rectStyle || {
				stroke: 'red',
				fill: 'transparent',
				lineWidth: 2,
				close: true,
				zIndex:100
			};
		rectStyle.close = true;
		rectStyle.fill = rectStyle.fill || 'transparent';
		
		for(let i = 0; i<8; i++) {
			//生成改变大小方块
			const r = (this.graph || params.graph).createShape(jmRect,{
					position:{x:0,y:0},
					width: rs,
					height: rs,
					style: rectStyle,
					interactive: true
				});
			r.index = i;
			r.visible = true;
			this.resizeRects.push(r);	
			this.children.add(r);
			r.canMove(true,this.graph);	
		}	
		this.reset(0,0,0,0);//初始化位置
		//绑定其事件
		this.bindRectEvents();
	}

	/**
	 * 绑定周边拉伸的小方块事件
	 *
	 * @method bindRectEvents
	 * @private
	 */
	bindRectEvents() {		
		for(let i =0; i<this.resizeRects.length; i++) {
			const r = this.resizeRects[i];		
			//小方块移动监听
			r.on('move',function(arg) {					
				let px=0, py=0, dx=0, dy=0;
				if(this.index == 0) {				
					dx = - arg.offsetX;
					px = arg.offsetX;						
				}
				else if(this.index == 1) {
					dx = - arg.offsetX;
					px = arg.offsetX;				
					dy = - arg.offsetY;
					py = arg.offsetY;						
				}
				else if(this.index == 2) {				
					dy = -arg.offsetY;				
					py = arg.offsetY;						
				}
				else if(this.index == 3) {
					dx = arg.offsetX;				
					dy = -arg.offsetY;
					py = arg.offsetY;
				}
				else if(this.index == 4) {
					dx = arg.offsetX;							
				}
				else if(this.index == 5) {
					dx = arg.offsetX;
					dy = arg.offsetY;					
				}
				else if(this.index == 6) {
					dy = arg.offsetY;					
				}
				else if(this.index == 7) {
					dx = - arg.offsetX;
					dx = - arg.offsetX;
					px = arg.offsetX;
					dy = arg.offsetY;				
				}
				//重新定位
				this.parent.reset(px, py, dx, dy);
				this.needUpdate = true;
			});
			//鼠标指针
			r.bind('mousemove', function() {	
				// 如果有旋转方位，则重新定义小块的作用
				const rotation = this.parent.getRotation();	
				let cursor = this.parent.rectCursors[this.index];

				// 旋转一定角度后的位置
				const position = rotation && rotation.angle? this.graph.utils.rotatePoints(this.graph.utils.clone(this.position), rotation, rotation.angle): this.position;
				const center = {
					x: this.parent.width / 2,
					y: this.parent.height / 2
				};

				this.rotationAngleByCenter = Math.atan((position.y - center.y) / (position.x - center.x));// 与中心连线和x轴的夹角
				// 把90度分割成三个区域，不同的指针
				const angleSplit1 = Math.atan(center.y / center.x) / 2;
				const angleSplit2 = angleSplit1 * 2 + Math.PI / 4;

				// 如果在左边，
				if(position.x < center.x) {
					if(this.rotationAngleByCenter >= -angleSplit1 && this.rotationAngleByCenter <= angleSplit1) {
						cursor = this.parent.rectCursors[0];
					}
					else if(this.rotationAngleByCenter > angleSplit1 && this.rotationAngleByCenter < angleSplit2) {
						cursor = this.parent.rectCursors[1];
					}
					else if(this.rotationAngleByCenter >= angleSplit2) {
						cursor = this.parent.rectCursors[2];
					}
					else if(this.rotationAngleByCenter <= -angleSplit1 && this.rotationAngleByCenter > -angleSplit2) {
						cursor = this.parent.rectCursors[7];
					}
					else if(this.rotationAngleByCenter <= -angleSplit2) {
						cursor = this.parent.rectCursors[6];
					}
				}
				else {
					if(this.rotationAngleByCenter >= -angleSplit1 && this.rotationAngleByCenter <= angleSplit1) {
						cursor = this.parent.rectCursors[4];
					}
					else if(this.rotationAngleByCenter > angleSplit1 && this.rotationAngleByCenter < angleSplit2) {
						cursor = this.parent.rectCursors[5];
					}
					else if(this.rotationAngleByCenter >= angleSplit2) {
						cursor = this.parent.rectCursors[6];
					}
					else if(this.rotationAngleByCenter <= -angleSplit1 && this.rotationAngleByCenter > -angleSplit2) {
						cursor = this.parent.rectCursors[3];
					}
					else if(this.rotationAngleByCenter <= -angleSplit2) {
						cursor = this.parent.rectCursors[2];
					}
				}
						
				this.cursor = cursor;
			});
			r.bind('mouseleave', function() {
				this.cursor = 'default';
			});
		}
		/*
		// 如果是双指开始滑动
		let touchPositions;
		this.on('touchstart', (evt) => {
			if(evt.touches && evt.touches.legnth === 2) {
				touchPositions = evt.touches;
			}
		});

		// 如果是双指滑动
		//计算二手指滑动距离，然后再通过在父容器中的占比得到缩放比例
		this.on('touchmove', (evt) => {
			if(touchPositions && evt.touches && evt.touches.length == 2) {
				//上次滑动二指的距离
				const preOffX = touchPositions[0].x - touchPositions[1].x;
				const preOffY = touchPositions[0].y - touchPositions[1].y;
				const preDis = Math.sqrt(preOffX * preOffX + preOffY * preOffY);
				//当次滑动二指的距离
				const curOffX = evt.touches[0].x - evt.touches[1].x;
				const curOffY = evt.touches[0].y - evt.touches[1].y;
				const curDis = Math.sqrt(curOffX * curOffX + curOffY * curOffY);
	
				//const disx = Math.abs(preOffX - curOffX);//x轴滑行的距离
				//const disy = Math.abs(preOffY - curOffY);//y轴滑行的距离
				
				const offset = curDis - preDis;

				this.reset(0, 0, offset, offset);
			}
		});	
		// 结束滑动
		this.on('touchend touchcancel', (evt) => {
			touchPositions = null;
		});*/
	}

	/**
	 * 按移动偏移量重置当前对象，并触发大小和位置改变事件
	 * @method reset
	 * @param {number} px 位置X轴偏移
	 * @param {number} py 位置y轴偏移
	 * @param {number} dx 大小x轴偏移
	 * @param {number} dy 大小y轴偏移
	 */
	reset(px, py, dx, dy) {
		const minWidth = typeof this.style.minWidth=='undefined'?5:this.style.minWidth;
		const minHeight = typeof this.style.minHeight=='undefined'?5:this.style.minHeight;

		const location = this.getLocation();
		if(dx != 0 || dy != 0) {
			const w = location.width + dx;
			const h = location.height + dy;
			if(w >= minWidth || h >= minHeight) {
				if(w >= minWidth) {
					this.width = w;
				}
				else {
					px = 0;
					dx = 0;
				}
				if(h >= minHeight) {
					this.height = h;
				}
				else {
					py = 0;
					dy = 0;
				}
				//如果当前控件能移动才能改变其位置
				if(this.movable !== false && (px||py)) {
					const p = this.position;
					p.x = location.left + px;
					p.y = location.top + py;
					this.position = p;
				}			
				//触发大小改变事件
				this.emit('resize',px,py,dx,dy);
			}	
		}

		for(let i in this.resizeRects) {
			const r = this.resizeRects[i];
			switch(r.index) {
				case 0: {
					r.position.x = -r.width / 2;
					r.position.y = (location.height - r.height) / 2;
					break;
				}	
				case 1: {
					r.position.x = -r.width / 2;
					r.position.y = -r.height / 2;
					break;
				}		
				case 2: {
					r.position.x = (location.width - r.width) / 2;
					r.position.y = -r.height / 2;
					break;
				}
				case 3: {
					r.position.x = location.width - r.width / 2;
					r.position.y = -r.height / 2;
					break;
				}
				case 4: {
					r.position.x = location.width - r.width / 2;
					r.position.y = (location.height - r.height) / 2;
					break;
				}
				case 5: {
					r.position.x = location.width - r.width / 2;
					r.position.y = location.height - r.height /2;
					break;
				}
				case 6: {
					r.position.x = (location.width - r.height) / 2;
					r.position.y = location.height - r.height / 2;
					break;
				}
				case 7: {
					r.position.x = -r.width / 2;
					r.position.y = location.height - r.height / 2;
					break;
				}
			}
		}
	}
}

export { jmResize };