"use strict";

var JSZip = require("jszip");
var DOMParser = require("xmldom").DOMParser;
var XMLSerializer = require("xmldom").XMLSerializer;

var Style = require("./merge-styles");
var Media = require("./merge-media");
var RelContentType = require("./merge-relations-and-content-type");
var bulletsNumbering = require("./merge-bullets-numberings");

function DocxMerger(options, files) {
  this._body = [];
  this._header = [];
  this._footer = [];
  this._Basestyle = options.style || "source";
  this._style = [];
  this._numbering = [];
  this._pageBreak = options.pageBreak || true;
  this._files = [];
  var self = this;
  (files || []).forEach(function(file) {
    self._files.push(new JSZip(file));
  });
  this._contentTypes = {};

  this._media = {};
  this._rel = {};

  this._builder = this._body;

  this.insertPageBreak = function() {
    var pb = '<w:p> \
					<w:r> \
						<w:br w:type="page"/> \
					</w:r> \
				  </w:p>';

    this._builder.push(pb);
  };

  this.insertRaw = function(xml) {
    this._builder.push(xml);
  };

  this.mergeBody = function(files) {
    var self = this;
    this._builder = this._body;

    RelContentType.mergeContentTypes(files, this._contentTypes);
    Media.prepareMediaFiles(files, this._media);
    RelContentType.mergeRelations(files, this._rel);

    Style.prepareStyles(files, this._style);
    Style.mergeStyles(files, this._style);

    files.forEach(function(zip, index) {
      //var zip = new JSZip(file);
      var xml = zip.file("word/document.xml").asText();
      xml = xml.substring(xml.indexOf("<w:body>") + 8);
      xml = xml.substring(0, xml.indexOf("</w:body>"));
      xml = xml.substring(0, xml.lastIndexOf("<w:sectPr"));

      self.insertRaw(xml);
      if (self._pageBreak && index < files.length - 1) self.insertPageBreak();
    });
  };

  this.save = function(type, callback) {
    var zip = this._files[0];

    var xml = zip.file("word/document.xml").asText();
    var startIndex = xml.indexOf("<w:body>") + 8;
    var endIndex = xml.lastIndexOf("<w:sectPr");

    xml = xml.replace(xml.slice(startIndex, endIndex), this._body.join(""));

    RelContentType.generateContentTypes(zip, this._contentTypes);
    Media.copyMediaFiles(zip, this._media, this._files);
    RelContentType.generateRelations(zip, this._rel);
    Style.generateStyles(zip, this._style);

    zip.file("word/document.xml", xml);

    callback(zip.generate({ type: type }));
  };

  if (this._files.length > 0) {
    this.mergeBody(this._files);
  }
}

module.exports = DocxMerger;
