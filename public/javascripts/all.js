(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Config;

Config = {
  NAME: "TCO Estimator",
  CLC_PRICING_URL_ROOT: "./prices/",
  DEFAULT_CURRENCY: {
    id: "USD",
    rate: 1.0,
    symbol: "$"
  },
  CURRENCY_FILE_PATH: "./currency/exchange-rates.json"
};

module.exports = Config;


},{}],2:[function(require,module,exports){
module.exports = _.extend({}, Backbone.Events);


},{}],3:[function(require,module,exports){
var PubSub, Router;

PubSub = require("./PubSub.coffee");

Router = Backbone.Router.extend({
  routes: {
    "input/:data": "input"
  },
  input: function(data) {
    return PubSub.trigger("url:change", JSON.parse(data));
  }
});

module.exports = Router;


},{"./PubSub.coffee":2}],4:[function(require,module,exports){
var Utils;

Utils = {
  getUrlParameter: function(sParam) {
    var i, sPageURL, sParameterName, sURLVariables;
    sPageURL = window.location.search.substring(1);
    sURLVariables = sPageURL.split('&');
    i = 0;
    while (i < sURLVariables.length) {
      sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] === sParam) {
        return sParameterName[1];
      }
      i++;
    }
  }
};

module.exports = Utils;


},{}],5:[function(require,module,exports){
var PlatformCollection, PlatformModel;

PlatformModel = require('../models/PlatformModel.coffee');

PlatformCollection = Backbone.Collection.extend({
  model: PlatformModel,
  url: "json/platforms.json",
  initialize: function() {
    return this.fetch();
  },
  forKey: function(type) {
    return _.first(this.where({
      "type": type
    }));
  }
});

module.exports = PlatformCollection;


},{"../models/PlatformModel.coffee":9}],6:[function(require,module,exports){
var ProductCollection, ProductModel;

ProductModel = require('../models/ProductModel.coffee');

ProductCollection = Backbone.Collection.extend({
  model: ProductModel,
  initialize: function() {}
});

module.exports = ProductCollection;


},{"../models/ProductModel.coffee":10}],7:[function(require,module,exports){
module.exports = {
  "iops": 611.74
};


},{}],8:[function(require,module,exports){
module.exports = {
  "cpu": 0.01,
  "ram": 0.015,
  "standardStorage": 0.0002,
  "premiumStorage": 0.0007,
  "bandwidth": 0.05,
  "windows": 0.04,
  "redhat": 0.04,
  "linux": 0
};


},{}],9:[function(require,module,exports){
var PlatformModel;

PlatformModel = Backbone.Model.extend({
  initialize: function() {},
  parse: function(data) {
    return data;
  }
});

module.exports = PlatformModel;


},{}],10:[function(require,module,exports){
var ProductModel;

ProductModel = Backbone.Model.extend({
  HOURS_PER_MONTH: 730,
  initialize: function() {
    this.settings = App.settingsModel;
    this.platformBenchmarking = App.platform.get("benchmarking");
    this.platformPricing = App.platform.get("pricing");
    return this.platformAdditionalFeatures = App.platform.get("additionalFeatures");
  },
  platformBandwidthPrice: function() {
    return this.settings.get("bandwidth") * this.platformPricing.bandwidthOutbound / this.HOURS_PER_MONTH;
  },
  platformStoragePrice: function() {
    return this.settings.get("storage") * this.platformPricing.standardPerGB / this.HOURS_PER_MONTH;
  },
  platformStorageIORequests: function() {
    return 5 * this.platformPricing.perMillionRequests / this.HOURS_PER_MONTH;
  },
  platformSnapshotCapacityUtilized: function() {
    var storage;
    if (this.settings.get("iops") > 0) {
      storage = 215;
    } else {
      storage = this.settings.get("storage");
    }
    return (storage * this.platformPricing.firstSnapshot) + (this.settings.get("snapshots") - 1) * this.platformPricing.remainingSnapshotsEach * storage;
  },
  platformSnapshotPrice: function() {
    return (this.platformSnapshotCapacityUtilized() * this.platformPricing.snapshotPerGB) / this.HOURS_PER_MONTH;
  },
  platformIOPSPrice: function() {
    var ebs, iops;
    iops = (this.settings.get("iops") * this.platformPricing.provisionedIOPSPerMonth) / this.HOURS_PER_MONTH;
    ebs = (215 * this.platformPricing.provisionedPerGB) / this.HOURS_PER_MONTH;
    if (this.settings.get("iops") > 0) {
      return iops + ebs;
    } else {
      return 0;
    }
  },
  platformOSPrice: function() {
    if (this.settings.get("os") === "linux") {
      return 0;
    } else {
      return this.get(this.settings.get("os"));
    }
  },
  platformTotalPrice: function() {
    var perRCU, subtotal, total;
    if (this.settings.get("iops") > 0) {
      subtotal = (this.get("price") + this.platformBandwidthPrice() + this.platformIOPSPrice() + this.platformSnapshotPrice() + this.platformOSPrice()) * this.settings.get("quantity");
    } else {
      subtotal = (this.get("price") + this.platformBandwidthPrice() + this.platformIOPSPrice() + this.platformStoragePrice() + this.platformSnapshotPrice() + this.platformStorageIORequests() + this.platformOSPrice()) * this.settings.get("quantity");
    }
    total = subtotal;
    if (App.platform.get("key") === "aws" || App.platform.get("key") === "azure") {
      if (this.settings.get("mcm")) {
        total += _.findWhere(this.platformAdditionalFeatures, {
          "key": "mcm"
        }).pricing;
      }
      if (this.settings.get("alertLogic")) {
        total += _.findWhere(this.platformAdditionalFeatures, {
          "key": "alertLogic"
        }).pricing;
      }
      if (this.settings.get("rightScale")) {
        perRCU = _.findWhere(this.platformAdditionalFeatures, {
          "key": "rightScale"
        }).pricing;
        total += this.get("rightScaleRCU") * perRCU;
      }
    }
    return total;
  },
  clcEquivalentRam: function() {
    if (this.settings.get("matchCPU")) {
      return Math.ceil(this.get("ram") / this.platformBenchmarking.ram);
    } else {
      return this.get("ram");
    }
  },
  clcEquivalentCpu: function() {
    if (this.settings.get("matchCPU")) {
      return Math.ceil(this.get("cpu") / this.platformBenchmarking.cpu);
    } else {
      return this.get("cpu");
    }
  },
  clcRamPrice: function() {
    return this.clcEquivalentRam() * App.clcPricing.ram;
  },
  clcCpuPrice: function() {
    return this.clcEquivalentCpu() * App.clcPricing.cpu;
  },
  clcDiskPrice: function() {
    var price;
    if (parseInt(this.settings.get("snapshots")) === 5) {
      price = this.settings.get("storage") * App.clcPricing.standardStorage;
    } else if (parseInt(this.settings.get("snapshots")) === 14) {
      price = this.settings.get("storage") * App.clcPricing.premiumStorage;
    }
    return price;
  },
  clcBandwidthPrice: function() {
    return this.settings.get("bandwidth") * App.clcPricing.bandwidth / this.HOURS_PER_MONTH;
  },
  clcOSPrice: function() {
    return App.clcPricing[this.settings.get("os")] * this.clcEquivalentCpu();
  },
  clcTotalPrice: function() {
    var total;
    total = (this.clcRamPrice() + this.clcCpuPrice() + this.clcDiskPrice() + this.clcBandwidthPrice() + this.clcOSPrice()) * this.settings.get("quantity");
    return total;
  },
  variance: function() {
    return this.platformTotalPrice() - this.clcTotalPrice();
  },
  savings: function() {
    if (this.settings.get("quantity") > 0) {
      return Math.round((1 - (this.clcTotalPrice()) / this.platformTotalPrice()) * 100);
    } else {
      return 0;
    }
  }
});

module.exports = ProductModel;


},{}],11:[function(require,module,exports){
var SettingsModel;

SettingsModel = Backbone.Model.extend({
  defaults: {
    platform: "aws",
    quantity: 1,
    os: "linux",
    storage: 100,
    bandwidth: 1000,
    snapshots: 5,
    matchCPU: false,
    matchIOPS: false,
    iops: 0,
    additionalFeatures: [],
    currency: {
      symbol: "$",
      id: "USD",
      rate: 1.0
    }
  },
  initialize: function() {}
});

module.exports = SettingsModel;


},{}],12:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<label for='" + ($e($c(this.model.key))) + "'>\n  <input id='" + ($e($c(this.model.key))) + "' name='" + ($e($c(this.model.key))) + "' type='checkbox'>");

$o.push("  " + $e($c(this.model.name)));

$o.push("</label>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],13:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td>" + ($e($c(this.model.clcEquivalentCpu()))) + "</td>\n<td>" + ($e($c(this.model.clcEquivalentRam()))) + "</td>\n<td>" + ($e($c(accounting.formatMoney(this.model.clcTotalPrice() * window.App.currency.rate, {
  precision: 3,
  symbol: this.app.currency.symbol
})))) + "</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '');

}).call(options)
};
},{}],14:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='left-align'>" + ($e($c(this.model.get("name")))) + "</td>\n<td>" + ($e($c(this.model.get("cpu")))) + "</td>\n<td>" + ($e($c(this.model.get("ram")))) + "</td>\n<td>" + ($e($c(accounting.formatMoney(this.model.platformTotalPrice() * window.App.currency.rate, {
  precision: 3,
  symbol: this.app.currency.symbol
})))) + "</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],15:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td>" + ($e($c(accounting.formatMoney(this.model.variance() * window.App.currency.rate, {
  precision: 3,
  symbol: this.app.currency.symbol
})))) + "</td>\n<td>" + ($e($c(accounting.formatMoney(this.model.variance() * 8765.81 * window.App.currency.rate, {
  precision: 2,
  symbol: this.app.currency.symbol
})))) + "</td>\n<td>" + ($e($c("" + (this.model.savings()) + "%"))) + "</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '');

}).call(options)
};
},{}],16:[function(require,module,exports){
var AdditionalFeatureView;

AdditionalFeatureView = Backbone.View.extend({
  tagName: "span",
  className: "additional-feature",
  initialize: function(options) {},
  render: function() {
    var template;
    template = require("../templates/additionalFeature.haml");
    this.$el.html(template({
      model: this.model
    }));
    return this;
  }
});

module.exports = AdditionalFeatureView;


},{"../templates/additionalFeature.haml":12}],17:[function(require,module,exports){
var CenturyLinkProductView;

CenturyLinkProductView = Backbone.View.extend({
  tagName: "tr",
  className: "product",
  initialize: function(options) {
    return this.app = options.app || {};
  },
  render: function() {
    var template;
    template = require("../templates/centuryLinkProduct.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    return this;
  }
});

module.exports = CenturyLinkProductView;


},{"../templates/centuryLinkProduct.haml":13}],18:[function(require,module,exports){
var CenturyLinkProductView, CenturyLinkProductsView, PubSub;

PubSub = require('../PubSub.coffee');

CenturyLinkProductView = require('../views/CenturyLinkProductView.coffee');

CenturyLinkProductsView = Backbone.View.extend({
  el: "#century-link-products-table",
  productViews: [],
  initialize: function(options) {
    this.app = options.app || {};
    return PubSub.on("inputPanel:change", this.updateProducts, this);
  },
  setCollection: function(productsCollection) {
    return this.productsCollection = productsCollection;
  },
  updateProducts: function() {
    if (!this.productsCollection) {
      return;
    }
    this.removeProducts();
    if (App.settingsModel.get("matchCPU")) {
      $(".description", this.$el).html("performance equivalent");
    } else {
      $(".description", this.$el).html("resource allocation equivalent");
    }
    return this.productsCollection.each((function(_this) {
      return function(product) {
        var productView;
        productView = new CenturyLinkProductView({
          model: product,
          app: _this.app
        });
        $("table", _this.$el).append(productView.render().el);
        return _this.productViews.push(productView);
      };
    })(this));
  },
  removeProducts: function() {
    return _.each(this.productViews, (function(_this) {
      return function(productView) {
        return productView.remove();
      };
    })(this));
  }
});

module.exports = CenturyLinkProductsView;


},{"../PubSub.coffee":2,"../views/CenturyLinkProductView.coffee":17}],19:[function(require,module,exports){
var AdditionalFeatureView, InputPanelView, PubSub, SettingsModel;

PubSub = require('../PubSub.coffee');

SettingsModel = require('../models/SettingsModel.coffee');

AdditionalFeatureView = require('./AdditionalFeatureView.coffee');

InputPanelView = Backbone.View.extend({
  el: "#input-panel",
  events: {
    "change #platform-select": "onPlatformChanged",
    "change #currency-select": "onCurrencyChanged",
    "keypress .number": "ensureNumber",
    "change select": "onFormChanged",
    "keyup input": "onFormChanged",
    "change input[type=checkbox]": "onFormChanged",
    "click .share-btn": "openSharePanel",
    "click .reset-btn": "resetForm"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = options.app || {};
    this.listenTo(this.model, 'change', this.render);
    this.render();
    this.initPlatforms();
    this.onPlatformChanged();
    return $('.has-tooltip', this.$el).tooltip();
  },
  render: function() {
    var key, value, _ref, _results;
    _ref = this.model.attributes;
    _results = [];
    for (key in _ref) {
      value = _ref[key];
      if (key === "os" || key === "snapshots") {
        _results.push($("option[value=" + value + "]", this.$el).attr("selected", "selected"));
      } else if (key === "matchIOPS" || key === "matchCPU") {
        _results.push($("input[name=" + key + "]", this.$el).attr("checked", value));
      } else {
        _results.push($("input[name=" + key + "]", this.$el).val(value));
      }
    }
    return _results;
  },
  onPlatformChanged: function() {
    var platformKey;
    platformKey = $("#platform-select", this.$el).val();
    PubSub.trigger("platform:change", {
      platformKey: platformKey
    });
    return this.buildPlatformAdditionalFeatures();
  },
  onCurrencyChanged: function() {
    var currencyKey, href;
    currencyKey = $("#currency-select", this.$el).val();
    PubSub.trigger("currency:change", {
      currencyKey: currencyKey
    });
    href = window.top.location.href;
    href = href.replace(/\?currency=.*/, "");
    href = "" + href + "?currency=" + currencyKey;
    return window.top.location.href = href;
  },
  onFormChanged: function() {
    var data;
    data = Backbone.Syphon.serialize(this);
    data = this.updateIOPS(data);
    this.model.set(data);
    return PubSub.trigger("inputPanel:change", data);
  },
  resetForm: function(e) {
    e.preventDefault();
    this.model.clear().set(this.model.defaults);
    return PubSub.trigger("inputPanel:change", this.model.defaults);
  },
  initPlatforms: function() {
    return this.options.platforms.each(function(platform) {
      return $("#platform-select", this.$el).append("<option value='" + (platform.get("key")) + "'>" + (platform.get("name")) + "</option>");
    });
  },
  updateIOPS: function(data) {
    var iops;
    if (data.matchIOPS) {
      iops = App.clcBenchmarking.iops;
      $("input[name=manual-iops]", this.$el).val("");
      $("input[name=manual-iops]").attr("disabled", true);
    } else {
      iops = $("input[name=manual-iops]", this.$el).val();
      $("input[name=manual-iops]").attr("disabled", false);
      iops = Math.max(iops, 0);
    }
    iops = Math.round(iops);
    $(".provisioned-iops", this.$el).html(iops);
    $("input[name=iops]", this.$el).val(iops);
    data = Backbone.Syphon.serialize(this);
    PubSub.trigger("inputPanel:change", data);
    return data;
  },
  buildPlatformAdditionalFeatures: function() {
    var features;
    features = App.platform.get("additionalFeatures");
    _.each(this.additionalFeatures, (function(_this) {
      return function(additionalFeatureView) {
        return additionalFeatureView.remove();
      };
    })(this));
    this.additionalFeatures = [];
    return _.each(features, (function(_this) {
      return function(feature) {
        var additionalFeatureView;
        additionalFeatureView = new AdditionalFeatureView({
          model: feature
        });
        $(".additional-features", _this.$el).append(additionalFeatureView.render().el);
        return _this.additionalFeatures.push(additionalFeatureView);
      };
    })(this));
  },
  openSharePanel: function(e) {
    var shareLink;
    e.preventDefault();
    shareLink = location.href + "#" + JSON.stringify(this.model.attributes);
    $(".share-link").val(shareLink);
    $(".share-link").attr("href", shareLink);
    $(".share-section").slideDown(300);
    $("#input-panel").slideUp(300);
    $(".share-link")[0].select();
    $(".ok-btn").off();
    return $(".ok-btn").click(function(e) {
      e.preventDefault();
      $(".share-section").slideUp(300);
      return $("#input-panel").slideDown(300);
    });
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    } else {
      return true;
    }
  }
});

module.exports = InputPanelView;


},{"../PubSub.coffee":2,"../models/SettingsModel.coffee":11,"./AdditionalFeatureView.coffee":16}],20:[function(require,module,exports){
var PlatformProductView;

PlatformProductView = Backbone.View.extend({
  tagName: "tr",
  className: "product",
  initialize: function(options) {
    return this.app = options.app || {};
  },
  render: function() {
    var template;
    template = require("../templates/platformProduct.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    return this;
  }
});

module.exports = PlatformProductView;


},{"../templates/platformProduct.haml":14}],21:[function(require,module,exports){
var PlatformProductView, PlatformProductsView, PubSub;

PubSub = require('../PubSub.coffee');

PlatformProductView = require('../views/PlatformProductView.coffee');

PlatformProductsView = Backbone.View.extend({
  el: "#platform-products-table",
  productViews: [],
  initialize: function(options) {
    this.app = options.app || {};
    return PubSub.on("inputPanel:change", this.updateProducts, this);
  },
  setCollection: function(productsCollection) {
    return this.productsCollection = productsCollection;
  },
  updateProducts: function() {
    if (!this.productsCollection) {
      return;
    }
    this.removeProducts();
    return this.productsCollection.each((function(_this) {
      return function(product) {
        var productView;
        productView = new PlatformProductView({
          model: product,
          app: _this.app
        });
        $("table", _this.$el).append(productView.render().el);
        return _this.productViews.push(productView);
      };
    })(this));
  },
  removeProducts: function() {
    return _.each(this.productViews, (function(_this) {
      return function(productView) {
        return productView.remove();
      };
    })(this));
  }
});

module.exports = PlatformProductsView;


},{"../PubSub.coffee":2,"../views/PlatformProductView.coffee":20}],22:[function(require,module,exports){
var VarianceView;

VarianceView = Backbone.View.extend({
  tagName: "tr",
  className: "variance",
  initialize: function(options) {
    return this.app = options.app || {};
  },
  render: function() {
    var template;
    template = require("../templates/variance.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    if (this.model.savings() > 0) {
      this.$el.addClass("green");
    } else {
      this.$el.addClass("red");
    }
    return this;
  }
});

module.exports = VarianceView;


},{"../templates/variance.haml":15}],23:[function(require,module,exports){
var PubSub, VarianceView, VariancesView;

PubSub = require('../PubSub.coffee');

VarianceView = require('../views/VarianceView.coffee');

VariancesView = Backbone.View.extend({
  el: "#variances-table",
  varianceViews: [],
  initialize: function(options) {
    this.app = options.app || {};
    return PubSub.on("inputPanel:change", this.updateProducts, this);
  },
  setCollection: function(productsCollection) {
    return this.productsCollection = productsCollection;
  },
  updateProducts: function() {
    if (!this.productsCollection) {
      return;
    }
    this.removeProducts();
    return this.productsCollection.each((function(_this) {
      return function(product) {
        var varianceView;
        varianceView = new VarianceView({
          model: product,
          app: _this.app
        });
        $("table", _this.$el).append(varianceView.render().el);
        return _this.varianceViews.push(varianceView);
      };
    })(this));
  },
  removeProducts: function() {
    return _.each(this.varianceViews, (function(_this) {
      return function(varianceView) {
        return varianceView.remove();
      };
    })(this));
  }
});

module.exports = VariancesView;


},{"../PubSub.coffee":2,"../views/VarianceView.coffee":22}],24:[function(require,module,exports){
var CenturyLinkProductsView, Config, DEFAULT_BENCHMARKING, DEFAULT_PRICING, InputPanelView, PRICES_URL_ROOT, PlatformProductsView, PlatformsCollection, ProductsCollection, PubSub, Router, SettingsModel, Utils, VariancesView;

Config = require('./app/Config.coffee');

Utils = require('./app/Utils.coffee');

PubSub = require('./app/PubSub.coffee');

Router = require('./app/Router.coffee');

InputPanelView = require('./app/views/InputPanelView.coffee');

PlatformProductsView = require('./app/views/PlatformProductsView.coffee');

VariancesView = require('./app/views/VariancesView.coffee');

CenturyLinkProductsView = require('./app/views/CenturyLinkProductsView.coffee');

SettingsModel = require('./app/models/SettingsModel.coffee');

PlatformsCollection = require('./app/collections/PlatformsCollection.coffee');

ProductsCollection = require('./app/collections/ProductsCollection.coffee');

DEFAULT_PRICING = require('./app/data/default-pricing-object.coffee');

DEFAULT_BENCHMARKING = require('./app/data/benchmarking.coffee');

PRICES_URL_ROOT = Config.CLC_PRICING_URL_ROOT;

window.App = {
  readyToInitCount: 0,
  clcBenchmarking: DEFAULT_BENCHMARKING,
  currency: {
    symbol: "",
    rate: 1.0,
    id: "USD"
  },
  init: function() {
    var dataFromURL;
    dataFromURL = this.getDataFromURL();
    this.settingsModel = new SettingsModel();
    if (dataFromURL) {
      this.settingsModel.set(dataFromURL);
    }
    this.platformsCollection = new PlatformsCollection();
    this.productsCollection = new ProductsCollection();
    this.loadCLCData();
    this.initEvents();
    this.router = new Router();
    return Backbone.history.start();
  },
  initEvents: function() {
    PubSub.on("platform:change", this.onPlatformChange, this);
    PubSub.on("inputPanel:change", this.onInputPanelChange, this);
    PubSub.on("url:change", this.onURLChange, this);
    this.platformsCollection.on("sync", (function(_this) {
      return function() {
        return _this.onPlatformCollectionSync();
      };
    })(this));
    return this.productsCollection.on('reset', (function(_this) {
      return function() {
        return _this.onProductsUpdated();
      };
    })(this));
  },
  onPlatformChange: function(e) {
    var products;
    this.platform = this.platformsCollection.findWhere({
      "key": e.platformKey
    });
    products = this.platform.get("products");
    return this.productsCollection.reset(products);
  },
  onPlatformCollectionSync: function() {
    this.readyToInitCount += 1;
    return this.buildUI();
  },
  onProductsUpdated: function() {
    this.platformProductsView.setCollection(this.productsCollection);
    this.platformProductsView.updateProducts();
    this.centuryLinkProductsView.setCollection(this.productsCollection);
    this.centuryLinkProductsView.updateProducts();
    this.variancesView.setCollection(this.productsCollection);
    return this.variancesView.updateProducts();
  },
  onInputPanelChange: function(data) {},
  onURLChange: function(data) {},
  loadCLCData: function() {
    $.ajax({
      type: "GET",
      url: PRICES_URL_ROOT + "default.json",
      success: (function(_this) {
        return function(data) {
          _this.clcPricing = _this.parsePricingData(data);
          return _this.onPricingSync();
        };
      })(this),
      error: (function(_this) {
        return function(error) {
          console.error(error);
          _this.clcPricing = DEFAULT_PRICING;
          return _this.onPricingSync();
        };
      })(this)
    });
    return this;
  },
  onPricingSync: function() {
    this.readyToInitCount += 1;
    this.buildUI();
    return this;
  },
  parsePricingData: function(categories) {
    var pricing;
    pricing = _.clone(DEFAULT_PRICING);
    _.each(categories, (function(category) {
      if (category.products != null) {
        return _.each(category.products, function(product) {
          var ids;
          if (_.has(product, 'key')) {
            ids = product.key.split(":");
            switch (ids[0]) {
              case 'server':
                switch (ids[1]) {
                  case 'storage':
                    if (ids[2] === 'standard') {
                      pricing.standardStorage = product.hourly;
                    }
                    if (ids[2] === 'premium') {
                      return pricing.premiumStorage = product.hourly;
                    }
                    break;
                  case 'os':
                    if (ids[2] === 'windows') {
                      pricing.windows = product.hourly;
                    }
                    if (ids[2] === 'redhat') {
                      return pricing.redhat = product.hourly;
                    }
                    break;
                  default:
                    if (ids[1] === 'cpu') {
                      pricing.cpu = product.hourly;
                    }
                    if (ids[1] === 'memory') {
                      return pricing.ram = product.hourly;
                    }
                }
                break;
              case 'networking':
                if (ids[1] === 'bandwidth') {
                  return pricing.bandwidth = product.monthly;
                }
            }
          }
        });
      }
    }));
    return pricing;
  },
  buildUI: function() {
    if (this.readyToInitCount !== 2) {
      return;
    }
    this.platformProductsView = new PlatformProductsView({
      app: this
    });
    this.centuryLinkProductsView = new CenturyLinkProductsView({
      app: this
    });
    this.variancesView = new VariancesView({
      app: this
    });
    return this.inputPanelView = new InputPanelView({
      model: this.settingsModel,
      platforms: this.platformsCollection,
      app: this
    });
  },
  getDataFromURL: function() {
    var data, dataString;
    if (location.hash.length > 10) {
      dataString = location.hash.substring(1);
      data = JSON.parse(dataString);
      location.hash = "";
      history.pushState("", document.title, window.location.pathname);
      return data;
    } else {
      return null;
    }
  },
  getCurrencyDataThenInit: function() {
    this.currencyId = Utils.getUrlParameter("currency") || "USD";
    return $.ajax({
      url: Config.CURRENCY_FILE_PATH,
      type: "GET",
      success: (function(_this) {
        return function(data) {
          var $currencySelect;
          $currencySelect = $("#currency-select");
          $currencySelect.html('');
          _.each(data["USD"], function(currency) {
            var $option, selected;
            selected = currency.id === _this.currencyId ? "selected" : "";
            $option = $("<option value='" + currency.id + "' " + selected + ">" + currency.id + "</option>");
            return $currencySelect.append($option);
          });
          _this.currency = data["USD"][_this.currencyId];
          return setTimeout(function() {
            return _this.init();
          }, 500);
        };
      })(this),
      error: (function(_this) {
        return function(error) {
          _this.currency = {
            rate: 1.0,
            id: "USD",
            symbol: "$"
          };
          _.each(data["USD"], function(currency) {
            var $option, selected;
            selected = currency.id === _this.currencyId ? "selected" : "";
            $option = $("<option value='" + currency.id + "' " + selected + ">" + currency.id + "</option>");
            return $currencySelect.append($option);
          });
          return setTimeout(function() {
            return _this.init();
          }, 500);
        };
      })(this)
    });
  }
};

$(function() {
  return App.getCurrencyDataThenInit();
});


},{"./app/Config.coffee":1,"./app/PubSub.coffee":2,"./app/Router.coffee":3,"./app/Utils.coffee":4,"./app/collections/PlatformsCollection.coffee":5,"./app/collections/ProductsCollection.coffee":6,"./app/data/benchmarking.coffee":7,"./app/data/default-pricing-object.coffee":8,"./app/models/SettingsModel.coffee":11,"./app/views/CenturyLinkProductsView.coffee":18,"./app/views/InputPanelView.coffee":19,"./app/views/PlatformProductsView.coffee":21,"./app/views/VariancesView.coffee":23}]},{},[24])