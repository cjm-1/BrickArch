/**
 * Copyright (c) 2019 by Christopher Mead. All rights reserved.
 *
 * This file is part of the Brick Arch project, an addon for QCAD 3.x.
 *
 * This script defines a tool for creating flat-gauge arches from user-defined
 * variables.
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
function FlatBrickArch(guiAction)
{
	BrickArch.call(this, guiAction);
	this.setUiOptions("FlatBrickArch.ui");
}
// [constructor]

// [inheritance]
FlatBrickArch.prototype = new BrickArch();
FlatBrickArch.includeBasePath = includeBasePath;
// [inheritance

//! [readToolBar]
FlatBrickArch.prototype.readToolBar = function()
{
	// Object to contain all user input from toolbar
	var Input = {};
	var optionsToolBar = EAction.getOptionsToolBar();
	// Reads input directly from user input
	Input.bottomLength = Number(optionsToolBar.findChild("Length").text);
	Input.archHeight = Number(optionsToolBar.findChild("Height").text);
	Input.jointSize = Number(optionsToolBar.findChild("JointSize").text);
	// Gets the skew type combo box as an object
	var skewTypeMenu = optionsToolBar.findChild("skewType");
	// Sets variables from input depending on whether user-supplied number is
	// skew angle or length
	switch (skewTypeMenu.currentIndex)
	{
		// If user input is skew in degrees
		case 0:
			Input.degSkew = Number(optionsToolBar.findChild("Skew").text);
			Input.radSkew = this.toRadians(Input.degSkew);
			Input.skewLength =
				this.findOppositeLengthA(Input.radSkew, Input.archHeight);
			break;
		// If user input is skew length in mm
		case 1:
			Input.skewLength = Number(optionsToolBar.findChild("Skew").text);
			Input.radSkew = Math.atan(Input.skewLength / Input.archHeight);
			Input.degSkew = Number((Input.radSkew / (Math.PI / 180)).toFixed(3));
			break;
	}
	// Calculates length of the top of the arch, required if user doesn't supply
	// brick count
	Input.topLength = Input.bottomLength + (Input.skewLength * 2);
	// Gets the brick width/count combo box as an object
	var brickWidthOrCountMenu = optionsToolBar.findChild("brickWidthOrCount");
	// Sets variables from input depending on whether user-supplied number is
	// brick width or count
	switch (brickWidthOrCountMenu.currentIndex)
	{
		// If user input is width of brick
		case 0:
			Input.brickWidth =
				Number(optionsToolBar.findChild("BrickWidthOrCount").text);
			Input.brickCount = this.countBricks(Input.topLength,
				Input.brickWidth, Input.jointSize);
			break;
		// If user input is brick count
		case 1:
			Input.brickCount =
				Number(optionsToolBar.findChild("BrickWidthOrCount").text);
			break;
	}
	// Returns the Input object to be used by buildArchData
	return Input;
}
//! [readToolBar]

//! [showDialog]
BrickArch.prototype.showDialog = function()
{
	// Object to hold all user input from dialog
	var Input = {};
	var dialog = WidgetFactory.createDialog(this.includeBasePath,
		"FlatBrickArchDialog.ui");
	WidgetFactory.restoreState(dialog);
	if (!dialog.exec())
	{
		dialog.destroy();
		EAction.activateMainWindow();
		return false;
	}
	var widgets = getWidgets(dialog);
	if (widgets["FullBrick"].checked===true)
	{
		Input.courseCount = 1;
		Input.hJointMode = "FullBrick";
	}
	else if (widgets["SingleJoint"].checked===true)
	{
		Input.courseCount = 2;
		Input.hJointMode = "SingleJoint";
		Input.smallHeight = Number(eval(widgets["SmallHeight"].text).toFixed(3));
		Input.invert = widgets["Invert"].checked;
	}
	if (widgets["Template"].checked===true)
	{
		Input.templateOrDrawing = "Template";
	}
	else if (widgets["Drawing"].checked===true)
	{
		Input.templateOrDrawing = "Drawing";
	}

	if (widgets["Line"].checked===true)
	{
		Input.lineMode = "Line";
	}
	else if (widgets["Polyline"].checked===true)
	{
		Input.lineMode = "Polyline";
	}

	WidgetFactory.saveState(dialog);

	dialog.destroy();
	EAction.activateMainWindow();
	return Input;
}
//! [showDialog]

//! [buildArchData]
FlatBrickArch.prototype.buildArchData = function(TBInput, DInput)
{
	// Object to hold all data required to plot and draw the arch
	var Arch = {};
	// Passing required variables to Arch object
	Arch.hJointMode = DInput.hJointMode;
	Arch.courseCount = DInput.courseCount;
	Arch.invert = DInput.invert;
	Arch.templateOrDrawing = DInput.templateOrDrawing;
	Arch.lineMode = DInput.lineMode;
	Arch.brickCount = TBInput.brickCount;
	// Copy jointSize variable to this function due to frequency of use
	var jointSize = TBInput.jointSize;

	// If document is a template, only draw half of the bricks (+ key)
	switch (DInput.templateOrDrawing)
	{
		case "Template":
			// If document is a drawing, draw half of the bricks
			Arch.drawCount = ceil(TBInput.brickCount / 2);
			break;
		case "Drawing":
			// If document is a drawing, draw every brick
			Arch.drawCount = TBInput.brickCount;
			break;
	}

	// Object to hold every required height
	var Height = {};
	Height.bottom = 0;
	Height.top = TBInput.archHeight;
	
	// Object to hold space to leave at start for skew at every required height
	var SkewSpace = {};
	SkewSpace.bottom = TBInput.skewLength;
	SkewSpace.top = 0;
	
	// Object to hold lengths of arch at every required height
	var Length = {};
	Length.bottom = TBInput.bottomLength;
	Length.top = TBInput.topLength;
	
	// Object to hold horizontal widths of bricks at every required height
	var BrickWidth = {};
	BrickWidth.bottom = this.findSingleWidth(Length.bottom, TBInput.brickCount,
		jointSize);
	BrickWidth.top = this.findSingleWidth(Length.top, TBInput.brickCount,
		jointSize);
	
	// Object to hold convenient lenths comprising brick widths and joints
	var BrickAndJoint = {};
	BrickAndJoint.bottom = BrickWidth.bottom + jointSize;
	BrickAndJoint.top = BrickWidth.top + jointSize;

	// If arch has at least one horizontal joint, create data for it
	if (DInput.hJointMode == "SingleJoint")
	{
		// List holding all required height data
		Height.hJoint0 = {};
		Height.hJoint0.bottom = DInput.smallHeight;
		Height.hJoint0.top = Height.hJoint0.bottom + jointSize;

		// List holding space to leave for skew at every required height
		SkewSpace.hJoint0 = {};
		SkewSpace.hJoint0.bottom = SkewSpace.bottom -
			this.findOppositeLengthA(TBInput.radSkew, Height.hJoint0.bottom);
		SkewSpace.hJoint0.top = SkewSpace.bottom -
			this.findOppositeLengthA(TBInput.radSkew, Height.hJoint0.top);

		// List holding arch lengths at top and bottom of horizontal joint
		Length.hJoint0 = {};
		Length.hJoint0.bottom = (this.findOppositeLengthA(TBInput.radSkew,
			Height.hJoint0.bottom) * 2) + Length.bottom;
		Length.hJoint0.top = (this.findOppositeLengthA(TBInput.radSkew,
			Height.hJoint0.top) * 2) + Length.bottom;

		// List holding brick widths at top and bottom of horizontal joint
		BrickWidth.hJoint0 = {};
		BrickWidth.hJoint0.bottom = this.findSingleWidth(Length.hJoint0.bottom,
			TBInput.brickCount, jointSize);
		BrickWidth.hJoint0.top = this.findSingleWidth(Length.hJoint0.top,
			TBInput.brickCount, jointSize);

		// List holding convenient lengths comprising brick widths and joints
		BrickAndJoint.hJoint0 = {};
		BrickAndJoint.hJoint0.bottom = BrickWidth.hJoint0.bottom + jointSize;
		BrickAndJoint.hJoint0.top = BrickWidth.hJoint0.top + jointSize;
	}
	// Copying required objects into the Arch object
	Arch.Height = Height;
	Arch.SkewSpace = SkewSpace;
	Arch.Length = Length;
	Arch.BrickWidth = BrickWidth;
	Arch.BrickAndJoint = BrickAndJoint;
	// Return the Arch object for use by calculatePoints, drawArch and labelArch
	return Arch;
}
//! [buildArchData]

//! [calculatePoints]
// Uses skewLength, bottomWidth, topWidth, archHeight and jointSize to calculate
// initial corner points for the arch drawing
FlatBrickArch.prototype.calculatePoints = function(Arch)
{
	// Create list variable for brick courses
	var courses = [];
	switch (Arch.hJointMode)
	{
		case "FullBrick":
			// List variable to hold whole bricks
			var bricks = [];
			// For each brick in arch, calculates vectors for all four corners
			// and stores them in a list
			for (brick = 0; brick < Arch.brickCount; brick++)
			{
				bricks[brick] = [];
				// Bottom-left corner
				bricks[brick].push([Arch.SkewSpace.bottom + 
					(brick * Arch.BrickAndJoint.bottom), 0]);
				// Bottom-right corner
				bricks[brick].push([Arch.SkewSpace.bottom + 
					(brick * Arch.BrickAndJoint.bottom) +
					Arch.BrickWidth.bottom, 0]);
				// Top-right corner
				bricks[brick].push([(brick * Arch.BrickAndJoint.top)+
					Arch.BrickWidth.top, Arch.Height.top]);
				// Top-left corner
				bricks[brick].push([brick * Arch.BrickAndJoint.top,
					Arch.Height.top]);
			}
			courses.push(bricks);
			break;
		case "SingleJoint":
			var bricks = [];
			// First course
			for (brick = 0; brick < Arch.brickCount; brick++)
			{
				bricks[brick] = [];
				// Bottom-left
				bricks[brick].push([Arch.SkewSpace.bottom +
					(brick * Arch.BrickAndJoint.bottom), 0]);
				// Bottom-right
				bricks[brick].push([Arch.SkewSpace.bottom +
					(brick * Arch.BrickAndJoint.bottom) +
					Arch.BrickWidth.bottom, 0]);
				// If full brick:
				if (brick % 2 == Arch.invert)
				{
					// Top-right
					bricks[brick].push([(brick *
						Arch.BrickAndJoint.top) +
						Arch.BrickWidth.top, Arch.Height.top]);
					// Top-left
					bricks[brick].push([brick *
						Arch.BrickAndJoint.top, Arch.Height.top]);
				}
				// If half brick
				else
				{
					// Top-right
					bricks[brick].push([Arch.SkewSpace.hJoint0.bottom +
						(brick * Arch.BrickAndJoint.hJoint0.bottom) +
						Arch.BrickWidth.hJoint0.bottom,
						Arch.Height.hJoint0.bottom]);
					// Top-left
					bricks[brick].push([Arch.SkewSpace.hJoint0.bottom +
						(brick * Arch.BrickAndJoint.hJoint0.bottom),
						Arch.Height.hJoint0.bottom]);
				}
			}
			courses.push(bricks);
			bricks = [];
			// Second course
			for (brick = 0; brick < Arch.brickCount; brick++)
			{
				if (brick % 2 != Arch.invert)
				{
					bricks[brick] = [];
					// Bottom-left
					bricks[brick].push([Arch.SkewSpace.hJoint0.top +
						(brick * Arch.BrickAndJoint.hJoint0.top),
						Arch.Height.hJoint0.top]);
					// Bottom-right
					bricks[brick].push([Arch.SkewSpace.hJoint0.top +
						(brick * Arch.BrickAndJoint.hJoint0.top) +
						Arch.BrickWidth.hJoint0.top, Arch.Height.hJoint0.top]);
					// Top-right
					bricks[brick].push([brick * Arch.BrickAndJoint.top +
						Arch.BrickWidth.top, Arch.Height.top]);
					// Top-left
					bricks[brick].push([brick * Arch.BrickAndJoint.top,
						Arch.Height.top]);
				}
				else
				{
					bricks[brick] = false;
				}
			}
			courses.push(bricks);
			break;
	}
	return courses;
}
//! [calculatePoints]
	
//! [labelArch]
BrickArch.prototype.labelArch = function(Arch, points, colour1,colour2,colour3)
{
	var doc = this.getDocumentInterface();
	// Length labels, in colour 1
	addLayer("length", colour1, "CONTINUOUS", RLineweight.Weight025);
	doc.setCurrentLayer("length");
	this.drawHorizontalDim([Arch.SkewSpace.bottom,0], [Arch.SkewSpace.bottom +
		Arch.Length.bottom, 0], [Arch.SkewSpace.bottom, -100]);
	this.drawHorizontalDim([0,Arch.Height.top], [Arch.Length.top, Arch.Height.top],
		[10000, Arch.Height.top + 100]);
	this.drawHorizontalDim([0,Arch.Height.top], [Arch.SkewSpace.bottom,0],
		[0,-100]);

	// Brick width labels, in colour 1
	var widthBrick = Math.floor(Arch.brickCount / 4);
	this.drawHorizontalDim([Arch.SkewSpace.bottom + (widthBrick *
		Arch.BrickAndJoint.bottom), 0], [Arch.SkewSpace.bottom +
		(widthBrick * Arch.BrickAndJoint.bottom) + Arch.BrickWidth.bottom, 0],
		[0,-50]);
	this.drawHorizontalDim([widthBrick * Arch.BrickAndJoint.top, Arch.Height.top],
		[(widthBrick * Arch.BrickAndJoint.top) + Arch.BrickWidth.top,
		Arch.Height.top], [0, Arch.Height.top + 50]);
	
	// Skew width labels, in colour 1
	var skewBrick = Math.floor(Arch.brickCount * 0.75);
	this.drawHorizontalDim([Arch.SkewSpace.bottom + (skewBrick *
		Arch.BrickAndJoint.bottom) + Arch.BrickWidth.bottom, 0],
		[Arch.SkewSpace.bottom + (skewBrick + 1) * Arch.BrickAndJoint.bottom, 0],
		[0,-50]);
	this.drawHorizontalDim([(skewBrick * Arch.BrickAndJoint.top) +
		Arch.BrickWidth.top,Arch.Height.top], [(skewBrick + 1) *
		Arch.BrickAndJoint.top, Arch.Height.top], [0, Arch.Height.top + 50]);
	
	// Height labels, in colour 2
	addLayer("height", colour2, "CONTINUOUS", RLineweight.Weight025);
	doc.setCurrentLayer("height");
	this.drawVerticalDim([0,Arch.Height.top], [Arch.SkewSpace.bottom,0], 
		[-100, 0]);
	if (Arch.courseCount == 2)
	{
		// Find first position in arch that is in half
		var firstHalf = 0;
		if (points[1][firstHalf] == false)
		{
			firstHalf++;
		}
		this.drawVerticalDim(points[0][firstHalf][3], points[1][firstHalf][0], [-50,0]);
		// Find last position in arch that is in half
		var lastHalf = Arch.brickCount - 1;
		if (points[1][lastHalf] == false)
		{
			lastHalf--;
		}
		this.drawVerticalDim(points[0][lastHalf][1],
			points[0][lastHalf][2], [Arch.Length.top + 100, 0]);
		this.drawVerticalDim(points[1][lastHalf][1],
			points[1][lastHalf][2], [Arch.Length.top + 100, 0]);
	}

	// Angle and diagonal labels in colour 3
	addLayer("angle", colour3, "CONTINUOUS", RLineweight.Weight025);
	doc.setCurrentLayer("angle");

	// Attempt to make aligned dim - unsuccessful
	//var bottomRightCorner = new RVector(points[0][Arch.brickCount -1][1]);
	//var bottomRightPoint1 = new RVector(points[0][Arch.brickCount -1][2]);
	//var bottomRightPoint2 = new RVector(Arch.SkewSpace.bottom + Arch.Length.bottom +
	//	100, 0);
	//var aLine = new RLineData(bottomRightCorner, bottomRightPoint1);
	//var bLine = new RLineData(bottomRightCorner, bottomRightPoint2);

	//this.drawAngularDim(aLine, bLine, bottomRightPoint2);

	// Test of aligned dim - successful
	//this.drawAlignedDim([Arch.SkewSpace.bottom, 0], [Arch.Length.top,
	//	Arch.Height.top], [Arch.Length.top, Arch.Height.top]);

	// Reset to original layer
	doc.setCurrentLayer("0");
};
//! [labelArch]

//! [initUiOptions]
BrickArch.prototype.initUiOptions = function(resume, optionsToolBar)
{
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
	// Gets the skew type combo box as an object
	var skewTypeMenu = optionsToolBar.findChild("skewType");
	// Empties the skew type combo box
	skewTypeMenu.clear();
	// Adds the two entries in the skew type combo box
	skewTypeMenu.addItem(qsTr("°"));
	skewTypeMenu.addItem(qsTr("mm"));
	// Sets selection of skew type combo box to the first entry
	skewTypeMenu.currentIndex = 0;
}
//! [initUiOptions]
