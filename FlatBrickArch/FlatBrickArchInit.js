function init(basePath) {
	var action = new RGuiAction(qsTranslate("FlatBrickArch", "Flat-gauge Brick Arch"), 
		RMainWindowQt.getMainWindow());
	// Requires an existing open document
	action.setRequiresDocument(true);
	// Points to this script file
	action.setScriptFile(basePath + "/FlatBrickArch.js");
	// Points to vector graphic for icon
    action.setIcon(basePath + "/FlatBrickArch.svg");
    // Sets tooltip
    action.setStatusTip(qsTr("Draw a flat-gauge brick arch"));
    // Sets key sequence shortcut for the flat-gauge arch tool (f followed by a)
    action.setDefaultShortcut(new QKeySequence("f,a"));
    // Commands to open the flat-gauge brick arch tool from the command line
    action.setDefaultCommands(["flatbrickarch", "flatarch", "fa"]);
    // Places icon in a group
	action.setGroupSortOrder(20);
	// Sorts this tool near the top of the menu
	action.setSortOrder(10);
	// Lists the widgets that this tool should appear in
	action.setWidgetNames(["DrawBrickArchMenu", "BrickArchToolsPanel", "BrickArchMatrixPanel"]);
};
