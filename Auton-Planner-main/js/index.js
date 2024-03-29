const canvas = new fabric.Canvas('c');

//image has different propotions, actual field is different
//3 is like width of field perimiter
const C_HEIGHT = 560 - 3, C_WIDTH = 560 - 3;
const PT_RADIUS = 20;

const RAD2DEG = 57.2957795131;

const autonMovePoints = [];
const originalCoords = [];

const scaleInchesToCoords = (dist) => dist * (550 / 144.0);
const scaleCoordsToInches = (dist) => dist / (550 / 144.0);

class autonMovePoint {

	constructor(index, xPos, yPos) {
		this.index = index;

		this.fabricCircleElement = new fabric.Circle({
			radius: PT_RADIUS,
			fill: '#eef',
			originX: 'center',
			originY: 'center',
			strokeWidth: 2, // Border width
			stroke: 'black', // Border color
			opacity: 0.35
		});

		this.fabricTextElement = new fabric.Text(String(autonMovePoints.length), {
			fontSize: 20,
			originX: 'center',
			originY: 'center',
		});

		this.fabricGroup = new fabric.Group([this.fabricCircleElement, this.fabricTextElement], {
			left: xPos,
			top: C_HEIGHT - yPos,
		});

		this.fabricGroup.hasControls = false;
		canvas.add(this.fabricGroup);

		// Edges Management

		this.forwardEdge = undefined;
		this.backwardEdge = undefined;

		if (autonMovePoints.length) {
			const edge = new autonPathEdge(autonMovePoints[index - 1].getPointX() + PT_RADIUS, C_HEIGHT - autonMovePoints[index - 1].getPointY() + PT_RADIUS, xPos + PT_RADIUS, C_HEIGHT - yPos + PT_RADIUS);

			this.backwardEdge = edge;
			autonMovePoints[index - 1].forwardEdge = edge;
		}

		// Movement Callback
		this.fabricGroup.on('moving', () => {
			this.updateEdges();
		});
	}

	getPointX() {
		return this.fabricGroup.left;
	}

	getPointY() {
		return C_HEIGHT - this.fabricGroup.top;
	}

	updateEdges() {
		if (this.forwardEdge) this.forwardEdge.updateInitialPosition(this.fabricGroup.left, this.fabricGroup.top);
		if (this.backwardEdge) this.backwardEdge.updateFinalPosition(this.fabricGroup.left, this.fabricGroup.top);
	}

	setPositionX(x) {
		this.fabricGroup.set({ left: x })
		this.updateEdges();
	}

	setPositionY(y) {
		this.fabricGroup.set({ top: C_HEIGHT - y })
		this.updateEdges();
	}

}

class autonPathEdge {
	constructor(x1, y1, x2, y2) {
		this.fabricEdge = new fabric.Line([x1, y1, x2, y2], {
			stroke: 'red',
			strokeWidth: 4,
			selectable: false,
		});

		canvas.add(this.fabricEdge);
		canvas.renderAll();
	}

	updateInitialPosition(x, y) {
		this.fabricEdge.set({ x1: x + PT_RADIUS, y1: y + PT_RADIUS });
	}

	updateFinalPosition(x, y) {
		this.fabricEdge.set({ x2: x + PT_RADIUS, y2: y + PT_RADIUS });
	}
}

// Util Functions
const addAutonPoint = (x, y) => {
	let point = new autonMovePoint(autonMovePoints.length, scaleInchesToCoords(x), scaleInchesToCoords(y));
	autonMovePoints.push(point);

	originalCoords.push([x, y]);
}

const getAutonPointFromGroup = (group) => {
	for (object of group._objects) {
		if (object instanceof fabric.Text) return autonMovePoints[Number(object.text)];
	}
}

addAutonPoint(108.52, 14.34);
addAutonPoint(102.53, 51.79);
addAutonPoint(98.23, 65.84);
addAutonPoint(119.85, 71.22);
addAutonPoint(110.23, 70.96);
addAutonPoint(81.10, 72);
addAutonPoint(120.11, 70.96);
addAutonPoint(110.49, 70.96);
addAutonPoint(81.10, 51.19);
addAutonPoint(118.55, 71.22);
addAutonPoint(110.23, 71.48);
addAutonPoint(107.63, 14.52);
addAutonPoint(73.82, 12.7);


// Field & Robot

const fieldInstance = new fabric.Image(document.getElementById('fieldbg'), {
	selectable: false
});

const robot = new fabric.Image(document.getElementById('robot'), {
	// selectable: false,
	originX: 'center',
	originY: 'center',
	scaleX: 0.2,
	scaleY: 0.2,
	left: autonMovePoints[0].getPointX() + (PT_RADIUS / 2),
	top: C_HEIGHT - autonMovePoints[0].getPointY() + (PT_RADIUS / 2),
	visible: false
});


canvas.add(fieldInstance);
canvas.add(robot);


// Main Functions
const updateCode = () => {

	let codeString = "";
	let currentAngle = 0;

	autonMovePoints.forEach((element, index) => {
		if (index === autonMovePoints.length - 1) return; // skip last
		const currentXInches = scaleCoordsToInches(element.getPointX() + PT_RADIUS);
		const currentYInches = scaleCoordsToInches(element.getPointY() + PT_RADIUS);

		const nextXInches = scaleCoordsToInches(autonMovePoints[index + 1].getPointX() + PT_RADIUS);
		const nextYInches = scaleCoordsToInches(autonMovePoints[index + 1].getPointY() + PT_RADIUS);


		console.log({ currentXInches, currentYInches, nextXInches, nextYInches });

		const lookDir = (-1 * Math.atan2(currentYInches - nextYInches, currentXInches - nextXInches) * RAD2DEG) + currentAngle - 90;
		if (lookDir > 180) {
			lookDir -= 360;
		}
		else if (lookDir < -180) {
			lookDir += 360;
		}
		const dist = Math.sqrt((currentYInches - nextYInches) * (currentYInches - nextYInches) + (currentXInches - nextXInches) * (currentXInches - nextXInches));
		dist *= 2.54;

		currentAngle -= lookDir;
		codeString += `${Math.abs(lookDir) < 3 ? "//" : ''}this->turnToAngleRelative(${lookDir.toFixed(2)});\n`
		codeString += `this->moveLateral(${dist.toFixed(2)});\n`
	})

	$("#codeContent").text(codeString);
	Prism.highlightAll();
}

const main = () => {
	autonMovePoints.forEach(ele => canvas.bringToFront(ele.fabricGroup));
	canvas.sendToBack(fieldInstance);
	canvas.renderAll();

	$("#selectedPoint").text(getAutonPointFromGroup(canvas.getActiveObject()).index);

	updateCode();

	$("#xpos").val(scaleCoordsToInches(canvas.getActiveObject().left));
	$("#ypos").val(scaleCoordsToInches(C_HEIGHT - canvas.getActiveObject().top));
}
updateCode();
const play = () => {
	robot.angle = 0;
	// Show bot & set pos
	canvas.bringToFront(robot);
	robot.set({
		left: autonMovePoints[0].getPointX() + PT_RADIUS,
		top: C_HEIGHT - autonMovePoints[0].getPointY() + PT_RADIUS,
		visible: true
	});

	// Anims
	autonMovePoints.forEach((element, index) => {
		setTimeout(() => {
			if (index === autonMovePoints.length - 1) return;
			const robotStartX = autonMovePoints[index].getPointX();
			const robotStartY = autonMovePoints[index].getPointY();
			const robotStartAngle = robot.angle;

			const robotEndX = autonMovePoints[index + 1].getPointX();
			const robotEndY = autonMovePoints[index + 1].getPointY();

			//const lookDir = (-1 * Math.atan2(currentYInches - nextYInches, currentXInches - nextXInches) * RAD2DEG) + currentAngle - 90;
			const lookAngle = (-1 * Math.atan2(robotStartY - robotEndY, robotStartX - robotEndX) * RAD2DEG) - 90;
			console.log("Robot Angle", robot.angle);
			console.log({ lookAngle });


			robot.animate('angle', lookAngle, {
				onChange: canvas.renderAll.bind(canvas),
				onComplete: () => {
					robot.animate('left', robotEndX + PT_RADIUS, { onChange: canvas.renderAll.bind(canvas) });
					robot.animate('top', C_HEIGHT - robotEndY + PT_RADIUS, { onChange: canvas.renderAll.bind(canvas) });
					console.log("Final Robot Angle", robot.angle);
				}
			});

		}, index * 1000)

	})
}

// Events

$("#addPoint").click(function (e) {
	addAutonPoint(72, 72);
});

$("#reset").click(function (e) {
	robot.set({
		left: autonMovePoints[0].getPointX() + PT_RADIUS,
		top: C_HEIGHT - autonMovePoints[0].getPointY() + PT_RADIUS,
		visible: false
	});
	canvas.renderAll();
});

$("#update").click(function (e) {
	const autonPoint = getAutonPointFromGroup(canvas.getActiveObject());
	autonPoint.setPositionX(scaleInchesToCoords(Number($("#xpos").val())));
	autonPoint.setPositionY(scaleInchesToCoords(Number($("#ypos").val())));

	updateCode();

	canvas.renderAll();
});

$("#play").click(play);

$("#copy").click(function (e) {

	let saveData = "";
	autonMovePoints.forEach(point => {
		saveData += `addAutonPoint(${scaleCoordsToInches(point.getPointX()).toFixed(2)}, ${scaleCoordsToInches(point.getPointY()).toFixed(2)});\n`
	})

	navigator.clipboard.writeText(saveData);
});

canvas.on("selection:created", main);
canvas.on("selection:updated", main);
canvas.on("object:moving", main);



canvas.sendToBack(fieldInstance);
canvas.renderAll();
