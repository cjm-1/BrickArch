/**
 * Copyright (c) 2019 by Christopher Mead. All rights reserved.
 *
 * This file is part of the Brick Arch project, an addon for QCAD 3.x.
 *
 * This script contains the common functions and menu settings for all tools
 * included in the Brick Arch project.
 */

//! [include]
include("scripts/Draw/Draw.js");
include("scripts/simple.js");
//! [include]

/**
 * \class BrickArch
 * \brief Base class for all brick arch tools.
 * \ingroup ecma_draw
**/

//! [constructor]
function BrickArch(guiAction)
{
	EAction.call(this,guiAction);
};
//! [constructor]

//! [inheritance]
BrickArch.prototype = new Draw();
BrickArch.includeBasePath = includeBasePath;
//! [inheritance]

//! [beginEvent]
// This runs when this script is executed
BrickArch.prototype.beginEvent = function()
{
	EAction.prototype.beginEvent.call(this);
	this.setState(this.State.ConfigureToolBar);
}
//! [beginEvent]

//! [State]
BrickArch.prototype.State =
{
	ConfigureToolBar : 0,
	ConfigureDialog : 1,
};
//! [State]

//! [setState]
BrickArch.prototype.setState = function(state)
{
	EAction.prototype.setState.call(this, state);
	switch (state)
	{
		case this.State.ConfigureToolBar:
			break;
		case this.State.ConfigureDialog:
			var ToolBarInput = this.readToolBar();
			var DialogInput = this.showDialog();
			var ArchData = this.buildArchData(ToolBarInput, DialogInput);
			var ArchPoints = this.calculatePoints(ArchData);
			this.drawArch(ArchData, ArchPoints);
			this.terminate()
			break;
	}
}
//! [setState]

//! [beginEvent]
// This runs when this script is executed
BrickArch.prototype.beginEvent = function()
{
	Draw.prototype.beginEvent.call(this);
	if (!isNull(this.getGuiAction()) && this.getGuiAction().objectName ===
		"BrickArchPanelAction") 
	{
		// Creates the brick arch panel in the CAD toolbar and then terminates
		EAction.showCadToolBarPanel("BrickArchToolsPanel");
		this.terminate();
	}
};
//! [beginEvent]

//! [slotConfirm]
// Starts the calculation process when the Confirm button is clicked
BrickArch.prototype.slotConfirm = function()
{
	this.setState(this.State.ConfigureDialog);
}
//! [slotConfirm]

//! [slotClose]
// Terminates the tool if the Close button is clicked
BrickArch.prototype.slotClose = function()
{
	this.terminate()
}
//! [slotClose]

//! [drawArch]
// Draws arch pieces as polylines from RVectors in a nested array of "bricks"
BrickArch.prototype.drawArch = function(Arch, points)
{
	//var di = this.getDocumentInterface();
	//di.setRelativeZero(new RVector(100,100));
	// For every brick in the arch, draws it in the document as a polyline
	switch (Arch.lineMode)
	{
		case "Line":
			for (course = 0; course < Arch.courseCount; course++)
			{
				for (brick = 0; brick < Arch.drawCount; brick++)
				{
					if (points[course][brick])
					{
						this.addLineShape(points[course][brick], true);
					}
				}
			}
			break;
		case "Polyline":
			for (course = 0; course < Arch.courseCount; course++)
			{
				for (brick = 0; brick < Arch.drawCount; brick++)
				{
					if (points[course][brick])
					{
						addPolyline(points[course][brick], true);
					}
				}
			}
			break;
	}
	// If document is a drawing, label it in colour
	if (Arch.templateOrDrawing == "Drawing")
	{
		this.labelArch(Arch, points, "#7A263A", "#1BB1E7", "#F3D459");
	}
};
//! [drawArch]

//! [toRadians]
// Converts a value measured in degrees to radians
BrickArch.prototype.toRadians = function(number)
{
	result = number * Math.PI / 180;
	return result;
} // Returns the angle in radians
//! [toRadians]

//! [countBricks]
// Counts the number of bricks needed for 1 layer from the length needed to be
// filled, the size of the joint between and the max width of each brick
BrickArch.prototype.countBricks = function(fullLength, brickWidth, jointSize)
{
	// Calculates combined length of one brick and one joint
	var brickAndJoint = brickWidth + jointSize;
	// Finds the longest horizontal measurement of the arch plus one joint and
	// divides it by the length of a brick and a joint
	var brickCount = Math.ceil((fullLength + jointSize) / brickAndJoint);
	// Ensures that the number of bricks in arch is an odd number
	if (brickCount % 2 != 1) 
	{
		brickCount++;
	}
	return brickCount;
};
//! [countBricks]

//! [findOppositeLengthA]
// Finds the length of the opposite side of a right angled triangle, given the
// angle and the length of the adjacent side
BrickArch.prototype.findOppositeLengthA = function(angle, height) 
{
	var oppositeLength = Math.tan(angle) * height;
	return Number(oppositeLength.toFixed(3));
}
//! [findOppositeLengthA]

//! [findOppositeLengthH]
// Finds the length of the opposite side of a right angled triangle, given the
// angle and the length of the hypotenuse
BrickArch.prototype.findOppositeLengthH = function(angle, height)
{
	var oppositeLength = Math.sin(angle) * height;
	return Number(oppositeLength.toFixed(3));
}
//! [findOppositeLengthH]

//! [findSingleWidth]
// Finds the width a single brick should be on a line based on its length, the
// number of bricks to fill it and the size of the joint between
BrickArch.prototype.findSingleWidth = function(fullLength, brickCount, jointSize) 
{
	// Removes all joints from full length
	var justBricks = fullLength - ((brickCount - 1) *
		jointSize);
	// Divides what remains by the number of bricks in the arch
	var oneBrick = justBricks / brickCount;
	return Number(oneBrick.toFixed(3));
};
//! [findSingleWidth]

// Scripts for drawing dimensions

//! [drawHorizontalDim]
BrickArch.prototype.drawHorizontalDim = function(extensionPoint1,
	extensionPoint2, definitionPoint)
{
	include("scripts/Draw/Dimension/DimHorizontal/DimHorizontal.js");
	var di = getDocumentInterface();
	var doc = this.getDocument();
	// create and initialize tool:
	var a = new DimHorizontal();
	
	// Amend getOperation for absence of scale value in toolbar
	a.getOperation = function(preview) {
    	if (!this.data.isValid()) {
    	    return undefined;
    	}

    	var doc = this.getDocument();
    	var scale = 1;
    	var scaled_data = this.data;

    	scaled_data.setLinearFactor(1/scale);

    	var entity = new RDimRotatedEntity(doc, scaled_data);
    	if (!isEntity(entity)) {
    	    return undefined;
    	}

    	return new RAddObjectOperation(entity, this.getToolTitle());
	};

	a.setDocumentInterface(di);

	a.data.setExtensionPoint1(new RVector(extensionPoint1));
	a.data.setExtensionPoint2(new RVector(extensionPoint2));
	a.data.setDefinitionPoint(new RVector(definitionPoint));

	// run operation on current document:
	var op = a.getOperation(false);
	di.applyOperation(op);
}
//! [drawHorizontalDim]

//! [drawVerticalDim]
BrickArch.prototype.drawVerticalDim = function(extensionPoint1,
	extensionPoint2, definitionPoint)
{
	include("scripts/Draw/Dimension/DimVertical/DimVertical.js");
	var di = getDocumentInterface();
	var doc = this.getDocument();
	// create and initialize tool:
	var a = new DimVertical();
	
	// Amend getOperation for absence of scale value in toolbar
	a.getOperation = function(preview) {
    	if (!this.data.isValid()) {
    	    return undefined;
    	}

    	var doc = this.getDocument();
    	var scale = 1;
    	var scaled_data = this.data;

    	scaled_data.setLinearFactor(1/scale);

    	var entity = new RDimRotatedEntity(doc, scaled_data);
    	if (!isEntity(entity)) {
    	    return undefined;
    	}

    	return new RAddObjectOperation(entity, this.getToolTitle());
	};

	a.setDocumentInterface(di);

	a.data.setExtensionPoint1(new RVector(extensionPoint1));
	a.data.setExtensionPoint2(new RVector(extensionPoint2));
	a.data.setDefinitionPoint(new RVector(definitionPoint));
	// Locks rotation of measurement to 90 degrees
	a.data.setRotation(Math.PI / 2);

	// run operation on current document:
	var op = a.getOperation(false);
	di.applyOperation(op);
}
//! [drawVerticalDim]

//! [drawAlignedDim]
BrickArch.prototype.drawAlignedDim = function(extensionPoint1,
	extensionPoint2, definitionPoint)
{
	include("scripts/Draw/Dimension/DimAligned/DimAligned.js");
	var di = getDocumentInterface();
	var doc = this.getDocument();
	// create and initialize tool:
	var a = new DimAligned();
	
	// Amend getOperation for absence of scale value in toolbar
	a.getOperation = function(preview) {
    	if (!this.data.isValid()) {
    	    return undefined;
    	}

    	var doc = this.getDocument();
    	var scale = 1;
    	var scaled_data = this.data;

    	scaled_data.setLinearFactor(1/scale);

    	var entity = new RDimAlignedEntity(doc, scaled_data);
    	if (!isEntity(entity)) {
    	    return undefined;
    	}

    	return new RAddObjectOperation(entity, this.getToolTitle());
	};

	a.setDocumentInterface(di);

	a.data.setExtensionPoint1(new RVector(extensionPoint1));
	a.data.setExtensionPoint2(new RVector(extensionPoint2));
	a.data.setDefinitionPoint(new RVector(definitionPoint));

	// run operation on current document:
	var op = a.getOperation(false);
	di.applyOperation(op);
}
//! [drawAlignedDim]

//! [drawAngularDim]
BrickArch.prototype.drawAngularDim = function(firstEntity, secondEntity,
	dimArcPosition)
{
	include("scripts/Draw/Dimension/DimAngular/DimAngular.js");
	var di = getDocumentInterface();
	var doc = this.getDocument();
	// create and initialize tool:
	var a = new DimAngular();

	var lineEntity1 = new RLineEntity(doc, firstEntity);
	var lineEntity2 = new RLineEntity(doc, secondEntity);

	a.setDocumentInterface(di);

	a.firstEntity = lineEntity1;
	a.secondEntity = lineEntity2;
	a.dimArcPosition = dimArcPosition;

	// run operation on current document:
	var op = a.getOperation(false);
	di.applyOperation(op);
}
//! [drawAngularDim]

//! [addLineShape]
BrickArch.prototype.addLineShape = function(pointList)
{
	for (point = 0; point < (pointList.length - 1); point++)
	{
		addLine(pointList[point],pointList[point + 1]);
	}
	addLine(pointList[pointList.length - 1],pointList[0]);
}
//! [addLineShape]

//! [getMenu]
// Defines the submenu in the Draw menu for brick arches
BrickArch.getMenu = function()
{
	var menu = EAction.getSubMenu(
		// New submenu object
		Draw.getMenu(),
		// groupSortOrder, sortOrder
		20, 1100,
		// Returns name of menu as a string
		BrickArch.getTitle(),
		// Identifier for this submenu
		"DrawBrickArchMenu",
		// Path to vector graphic for icon
		BrickArch.includeBasePath + "/BrickArch.svg"
	);
	// Points to this script file
	menu.setProperty("scriptFile", BrickArch.includeBasePath + "/BrickArch.js");
	return menu; // Returns the submenu object
};
//! [getMenu]

//! [getCadToolBarPanel]
// Defines the brick arch icon in the CAD toolbar panel
BrickArch.getCadToolBarPanel = function()
{
	// Inherits the CAD toolbar function from Draw
	var mtb = Draw.getCadToolBarPanel();
	// New CAD toolbar panel object
	var actionName = "BrickArchPanelAction";
	// Ensures no duplicate names for icons in CAD toolbar
	if (!isNull(mtb) && mtb.findChild(actionName)==undefined) 
	{
		// New RGuiAction to show brick arch toolbar panel
		var action = new RGuiAction(qsTr("Brick arches"), mtb);
		// Points to this script file
		action.setScriptFile(BrickArch.includeBasePath + "/BrickArch.js");
		action.objectName = actionName;
		// Requires an existing open document
		action.setRequiresDocument(true);
		// Path to vector graphic for icon
		action.setIcon(BrickArch.includeBasePath + "/BrickArch.svg");
		// Set tooltip
		action.setStatusTip(qsTr("Show types of brick arches"));
		// Sets key sequence shortcut for brick arch menu (r followed by c)
		action.setDefaultShortcut(new QKeySequence("r,c"));
		action.setNoState();
		// Command to open the brick arch panel from the command line
		action.setDefaultCommands(["brickarchmenu"]);
		// Places icon in the Draw group in the CAD toolbar panel
		action.setGroupSortOrder(20);
		// Places icon near the end of the Draw group
		action.setSortOrder(800);
		// Sets the name for other tools to place themselves in this menu
		action.setWidgetNames(["MainToolsPanel"]);
	}
	// Creates the toolbar panel object
	var tb = EAction.getCadToolBarPanel(BrickArch.getTitle(), "BrickArchToolsPanel",
		true);
	// Returns the brick arch panel
	return tb;
};
//! [getCadToolBarPanel]

//! [getToolMatrixPanel]
// Creates an entry in the tool matrix for the brick arch tools
BrickArch.getToolMatrixPanel = function()
{
	return EAction.getToolMatrixPanel(BrickArch.getTitle(), "BrickArchMatrixPanel",
		200);
};
//! [getToolMatrixPanel]

//! [getTitle]
// Returns the name of the menu as a string
BrickArch.getTitle = function()
{
	return qsTr("&Brick Arch");
};

BrickArch.prototype.getTitle = function()
{
	return BrickArch.getTitle();
};
//! [getTitle]

//! [init]
BrickArch.init = function()
{
	// Gets the submenu object
	BrickArch.getMenu();
	// Gets the Cad toolbar object
	BrickArch.getCadToolBarPanel();
	// Gets the toolmatrix entry object
	BrickArch.getToolMatrixPanel();
};
//! [init]
