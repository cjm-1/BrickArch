/**
 * Copyright (c) 2019 by Christopher Mead. All rights reserved.
 *
 * This file is part of the Brick Arch project, an addon for QCAD 3.0.
 *
 * This copy of Brick Arch is free software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public Licence as published by
 * the Free Software Foundation, either version 3 of the Licence, or
 * (at your option) any later version.
 *
 * This free version of Brick Arch is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERTHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public Licence for more details.
 */

// [include]
include("../BrickArch.js");
// [include]

/**
 * \class FlatBrickArch
 * \brief Draws a flat-gauge brick arch from user-defined dimensions.
 * \ingroup ecma_draw_brickarch
*/
// [constructor]
function FlatBrickArch(guiAction) {
	BrickArch.call(this, guiAction);
	this.setUiOptions("FlatBrickArch.ui");
	// Whether the tool accepts the width of a brick or the number of brick
	// columns
	mode : undefined;
	// Whether the tool accepts the skew as a length or an angle
	skewIsLength : false;
}
// [constructor]

// [inheritance]
FlatBrickArch.prototype = new BrickArch();
// [inheritance

//! [State]
FlatBrickArch.State = {
	AcquiringDimensions : 0,
	CalculatingDimensions : 1,
	CalculatingVectors : 2,
	DrawingArch : 3,
	Finished : 4
};
//! [State]

//! [setState]
FlatBrickArch.prototype.setState = function(state) {
	EAction.prototype.setState.call(this, state);
	switch (state) {
		case FlatBrickArch.State.AcquiringDimensions:
			this.acquireDimensions();
			break;
		case FlatBrickArch.State.CalculatingDimensions:
			this.calculateDimensions();
			break;
		case FlatBrickArch.State.CalculatingVectors:
			this.calculateVectors();
			break;
		case FlatBrickArch.State.DrawingArch:
			this.drawArch(this.Dimensions.cornerPoints);
			break;
		case FlatBrickArch.State.Finished:
			this.terminate();
	}
}
//! [setState]

//! [beginEvent]
// This runs when this script is executed
FlatBrickArch.prototype.beginEvent = function() {
	EAction.prototype.beginEvent.call(this);
	qDebug("FlatBrickArch.prototype.beginEvent was called.");
}
//! [beginEvent]

//! [slotConfirm]
// Starts the calculation process when the Confirm button is clicked
FlatBrickArch.prototype.slotConfirm = function() {
	this.setState(FlatBrickArch.State.AcquiringDimensions);
}
//! [slotConfirm]

//! [acquireDimensions]
FlatBrickArch.prototype.acquireDimensions = function() {
	var optionsToolBar = EAction.getOptionsToolBar();
	var brickWidthOrCountMenu = optionsToolBar.findChild("brickWidthOrCount");
	if (brickWidthOrCountMenu.currentIndex == 0) {
		FlatBrickArch.mode = "width";
	}
	else if (brickWidthOrCountMenu.currentIndex == 1) {
		FlatBrickArch.mode = "count";
	}
	// If user defined max brick width, set that in Dimensions
	if (FlatBrickArch.mode == "width") {
		this.Dimensions.brickWidth = Number(optionsToolBar.findChild("BrickWidthOrCount").text);
	}
	// If user defined brick count, set that in Dimensions
	else if (FlatBrickArch.mode == "count") {
		this.Dimensions.brickCount = Number(optionsToolBar.findChild("BrickWidthOrCount").text);
	}
	this.Dimensions.bottomLength = Number(optionsToolBar.findChild("Length").text);
	this.Dimensions.archHeight = Number(optionsToolBar.findChild("Height").text);
	this.Dimensions.jointSize = Number(optionsToolBar.findChild("JointSize").text);
	this.skewIsLength = Boolean(optionsToolBar.findChild("SkewIsLength").checked);
	if (this.skewIsLength) {
		this.Dimensions.skewLength = Number(optionsToolBar.findChild("Skew").text);
	}
	else { this.Dimensions.skew = Number(optionsToolBar.findChild("Skew").text);}
	this.setState(FlatBrickArch.State.CalculatingDimensions);
}

//! [calculateDimensions]
FlatBrickArch.prototype.calculateDimensions = function() {
	qDebug("Base length: " + this.Dimensions.bottomLength + "mm.");
	qDebug("Arch height: " + this.Dimensions.archHeight + "mm.");
	qDebug("Joint width: " + this.Dimensions.jointSize + "mm.");
	qDebug("Existing brick width: " + this.Dimensions.brickWidth + "mm.");

	// Finds the length of the skew from its angle
	if (this.skewIsLength == true) {
		// this.Dimensions.skew = 
	}
	else {
		qDebug("Skew: " + this.Dimensions.skew + " degrees.");
		this.Dimensions.skew = this.toRadians(this.Dimensions.skew);
		qDebug("Skew: " + this.Dimensions.skew.toFixed(3) + " radians.");
		this.Dimensions.skewLength = (Math.tan(this.Dimensions.skew) *
		this.Dimensions.archHeight).toFixed(3);
	}
	qDebug("Skew length: " + this.Dimensions.skewLength + "mm.");

	// Finds the length of the top of the arch
	this.Dimensions.topLength = Number(this.Dimensions.bottomLength +
	(2 * this.Dimensions.skewLength));
	qDebug("Top length: " + this.Dimensions.topLength + "mm.");

	if (FlatBrickArch.mode == "width") {
		// Calculates how many bricks needed to make one row of the arch
		this.Dimensions.brickCount = this.countBricks();
		qDebug("Brick count: " + this.Dimensions.brickCount);
	}
	
	// Finds the width of the bottom of each brick on the bottom row of the arch
	this.Dimensions.bottomWidth =
	this.findSingleWidth(this.Dimensions.bottomLength).toFixed(3);
	qDebug("Base single width: " + this.Dimensions.bottomWidth + "mm.");

	// Finds the widths of the top of each brick on the top row of the arch
	this.Dimensions.topWidth = 
	this.findSingleWidth(this.Dimensions.topLength).toFixed(3);
	qDebug("Top single width: " + this.Dimensions.topWidth + "mm.");
	this.setState(FlatBrickArch.State.CalculatingVectors);
}
//! [calculateDimensions]

//! [calculateVectors]
// Uses skewLength, bottomWidth, topWidth, archHeight and jointSize to calculate
// initial corner points for the arch drawing
FlatBrickArch.prototype.calculateVectors = function() {
	qDebug("Calculating corner points...");
	// Copies required variables as local variables
	var skewLength = Number(this.Dimensions.skewLength), bottomWidth = 
		Number(this.Dimensions.bottomWidth), topWidth = 
		Number(this.Dimensions.topWidth), archHeight = 
		Number(this.Dimensions.archHeight), jointSize = 
		Number(this.Dimensions.jointSize);
	// Convenient variables for frequently used combinations
	var bottomAndJoint = bottomWidth + jointSize, topAndJoint = 
		topWidth + jointSize;
	// List variable to hold whole bricks
	var bottomBricks = [];
	// For each brick in arch, calculates vectors for all four corners and
	// stores them in a list
	for (i = 0; i < this.Dimensions.brickCount; i++) {
		bottomBricks[i] = [];
		// Bottom-left corner
		bottomBricks[i][0] = new RVector(Number(skewLength + 
			(i * bottomAndJoint)), 0);
		qDebug("Brick " + (i + 1) + " first point: " + bottomBricks[i][0]);
		// Bottom-right corner
		bottomBricks[i][1] = new RVector(Number(skewLength + 
			(i * bottomAndJoint) + bottomWidth), 0);
		qDebug("Brick " + (i + 1) + " second point: " + bottomBricks[i][1]);
		// Top-right corner
		bottomBricks[i][2] = new RVector(Number((i * topAndJoint) + topWidth),
			archHeight);
		qDebug("Brick " + (i + 1) + " third point: " + bottomBricks[i][2]);
		// Top-left corner
		bottomBricks[i][3] = new RVector(Number(i * topAndJoint), archHeight);
		qDebug("Brick " + (i + 1) + " fourth point: " + bottomBricks[i][3]);
	}
	this.Dimensions.cornerPoints = bottomBricks;
	this.setState(FlatBrickArch.State.DrawingArch);
}
//! [calculateVectors]
	
//! [drawArch]
// Draws arch pieces as polylines from RVectors in a nested array of "bricks"
FlatBrickArch.prototype.drawArch = function(points) {
	qDebug("Drawing the arch...");
	// For every brick in the arch, draws it in the document as a polyline
	for (i = 0; i < this.Dimensions.brickCount; i++) {
		addPolyline(points[i], true);
	}
	this.setState(FlatBrickArch.State.Finished);
};
//! [drawArch]

//! [initUiOptions]
BrickArch.prototype.initUiOptions = function(resume, optionsToolBar) {
	EAction.prototype.initUiOptions.call(this, resume, optionsToolBar);
	// Gets the Width/Count combo box as an object
	var brickWidthOrCountMenu = optionsToolBar.findChild("brickWidthOrCount");
	// Empties the Width/Count combo box
	brickWidthOrCountMenu.clear();
	// Adds the two entries in the Width/Count combo box
	brickWidthOrCountMenu.addItem(qsTr("Brick width:"));
	brickWidthOrCountMenu.addItem(qsTr("Brick count:"));
	// Sets selection of Width/count combo box to the first entry
	brickWidthOrCountMenu.currentIndex = 0;
}
//! [initUiOptions]
