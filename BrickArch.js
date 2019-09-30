/**
 * Copyright (c) 2019 by Christopher Mead. All rights reserved.
 *
 * This file is part of the Brick Arch project, an addon for QCAD 3.x.
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

//! [Dimensions]
BrickArch.prototype.Dimensions =
{
	bottomLength : 1000,        // *
	archHeight : 200,           // *
	jointSize : 5,              // * Entered by user but includes fallback
	brickWidth : 65,            // * variables
	skew : 20,                  // *
	skewLength : undefined,     // Calculated from skew and archHeight
	bottomWidth : undefined,    // Calculated by findSingleWidth
	topLength : undefined,      // Calculated by findTopLength
	brickCount : undefined,     // Calculated by countBricks
	topWidth : undefined,       // Calculated by findSingleWidth using topLength
	cornerPoints : [],			// Finished points if arch is one brick high
	hJointPoints : [],          // Array of rows if arch has horizontal joints
};
//! [Dimensions]

//! [toRadians]
// Converts a value measured in degrees to radians
BrickArch.prototype.toRadians = function(number)
{
	result = number * Math.PI / 180;
	return result;
} // Returns the angle in radians
//! [toRadians]

//! [slotClose]
// Terminates the tool if the Close button is clicked
BrickArch.prototype.slotClose = function()
{
	this.terminate()
}
//! [slotClose]

//! [countBricks]
// Counts the number of bricks needed for 1 layer from the length needed to be
// filled, the size of the joint between and the max width of each brick
BrickArch.prototype.countBricks = function()
{
	// Calculates combined length of one brick and one joint
	var brickAndJoint = this.Dimensions.brickWidth +
		this.Dimensions.jointSize;
	// Finds the longest horizontal measurement of the arch plus one joint and
	// divides it by the length of a brick and a joint
	var brickCount = Math.ceil((this.Dimensions.topLength +
		this.Dimensions.jointSize) / brickAndJoint);
	// Ensures that the number of bricks in arch is an odd number
	if (brickCount % 2 != 1) 
	{
		brickCount++;
	}
	return brickCount;
};
//! [countBricks]

//! [findOppositeLength]
// Finds the length of the opposite side of a right angled triangle, from the
// opposite corner, measured in radians
BrickArch.prototype.findOppositeLength = function(angle, height) 
{
	var oppositeLength = Math.tan(angle) * height;
	return oppositeLength.toFixed(3);
}
//! [findOppositeLength]

//! [findSingleWidth]
// Finds the width a single brick should be on a line based on its length, the
// number of bricks to fill it and the size of the joint between
BrickArch.prototype.findSingleWidth = function(fullLength) 
{
	// Removes all joints from full length
	var justBricks = fullLength - ((this.Dimensions.brickCount - 1) *
		this.Dimensions.jointSize);
	// Divides what remains by the number of bricks in the arch
	var oneBrick = justBricks / this.Dimensions.brickCount;
	return oneBrick;
};
//! [findSingleWidth]

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
