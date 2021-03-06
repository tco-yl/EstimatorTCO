PlatformModel = require '../models/PlatformModel.coffee'
Config = require '../Config.coffee'

PlatformCollection = Backbone.Collection.extend
  model: PlatformModel
  url: Config.PLATFORMS_URL

  initialize: ->
    @fetch()

  forKey: (type) ->
    _.first @where("type": type)

module.exports = PlatformCollection