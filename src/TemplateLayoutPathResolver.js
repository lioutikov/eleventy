import fs from "node:fs";
import { TemplatePath } from "@11ty/eleventy-utils";
// import debugUtil from "debug";
// const debug = debugUtil("Eleventy:TemplateLayoutPathResolver");

class TemplateLayoutPathResolver {
	constructor(path, inputDir, extensionMap, eleventyConfig) {
		if (!eleventyConfig) {
			throw new Error("Expected `eleventyConfig` in TemplateLayoutPathResolver constructor");
		}
		this.eleventyConfig = eleventyConfig;
		this.inputDir = inputDir;
		this.originalPath = path;
		this.path = path;
		this.aliases = {};
		this.extensionMap = extensionMap;
		if (!extensionMap) {
			throw new Error("Expected `extensionMap` in TemplateLayoutPathResolver constructor.");
		}

		this.init();
	}

	setAliases() {
		this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);
	}

	set inputDir(dir) {
		this._inputDir = dir;
		this.dir = this.getLayoutsDir();
	}

	get inputDir() {
		return this._inputDir;
	}

	// for testing
	set config(cfg) {
		this._config = cfg;
		this.dir = this.getLayoutsDir();
		this.init();
	}

	get config() {
		if (this.eleventyConfig) {
			return this.eleventyConfig.getConfig();
		} else {
			throw new Error("Missing this.eleventyConfig");
		}
	}

	init() {
		// we might be able to move this into the constructor?
		this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);
		// debug("Current layout aliases: %o", this.aliases);

		if (this.path in this.aliases) {
			// debug(
			//   "Substituting layout: %o maps to %o",
			//   this.path,
			//   this.aliases[this.path]
			// );
			this.path = this.aliases[this.path];
		}

		let useLayoutResolution = this.config.layoutResolution;

		if (this.path.lastIndexOf(".").length > -1){
			[this.filename, this.layoutPath, this.fullPath] = this.findFileNameAndPath([this.path]);
		} else if (useLayoutResolution) {
			[this.filename, this.layoutPath, this.fullPath] = this.findFileNameAndPath(this.extensionMap.getFileList(this.path));
		}
	}

	addLayoutAlias(from, to) {
		this.aliases[from] = to;
	}

	getFileName() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalPath} (${this.filename})`,
			);
		}

		return this.filename;
	}

	getFullPath() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalPath} (${this.filename})`,
			);
		}

		return this.fullPath;
	}

	findFileNameAndPath(filenames){
		for (let layoutPath of this.dir) {
			// TODO it seems unnecessary/inefficient to check this here for every "this.path"
			// It might be more efficient to test if the path exists once for each path in "EleventyFiles"
			if (!fs.existsSync(layoutPath)) {
				throw Error(
					`TemplateLayoutPathResolver directory does not exist for ${this.path} + : ${layoutPath}`
				);
			}

			for (let filename of filenames) {
				// TODO async
				if (fs.existsSync(layoutPath + "/" + filename)) {
					return [filename, layoutPath, TemplatePath.addLeadingDotSlash(layoutPath + "/" + filename)];
				}
			}
		}
		return [null, null, null];
	}

	getLayoutsDir() {
		let layoutsDir;
		if ("layouts" in this.config.dir) {
			layoutsDir = this.config.dir.layouts;
		} else if ("includes" in this.config.dir) {
			layoutsDir = [this.config.dir.includes];
		} else {
			// Should this have a default?
			layoutsDir = ["_includes"];
		}

		return layoutsDir.map(layout => TemplatePath.join(this.inputDir, layout));
	}

	getNormalizedLayoutKey() {
		return TemplatePath.stripLeadingSubPath(this.fullPath, this.layoutPath);
	}
}

export default TemplateLayoutPathResolver;
