# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
from octoprint.events import Events
import flask
import http

from ..common.settings import SettingsKeys
from .PrinterUtils import PrinterUtils

class PluginAPI(octoprint.plugin.BlueprintPlugin):
    def is_blueprint_csrf_protected(self):
        return True

    def _getValueFromJSONOrNone(self, key, json):
        if key in json:
            return json[key]
        return None

    def _getStringFromJSONOrNone(self, key, json):
        value = self._getValueFromJSONOrNone(key, json)

        if value:
            return str(value)
        return None

    def _getIntFromJSONOrNone(self, key, json):
        value = self._getValueFromJSONOrNone(key, json)

        if value == None:
            return value

        try:
            value = int(value)
        except Exception as e:
            value = None

            errorMessage = str(e)
            self._logger.error("could not transform value '" + str(value) + "' for key '" + key + "' to int:" + errorMessage)

        return value

    @octoprint.plugin.BlueprintPlugin.route("/spoolman/spools", methods=["GET"])
    def handleGetSpoolsAvailable(self):
        self._logger.debug("API: GET /spoolman/spools")

        result = self.getSpoolmanConnector().handleGetSpoolsAvailable()

        if result.get('error', False):
            response = flask.jsonify(result)
            response.status = http.HTTPStatus.BAD_REQUEST

            return response

        return flask.jsonify(result)

    @octoprint.plugin.BlueprintPlugin.route("/self/spool", methods=["POST"])
    def handleUpdateActiveSpool(self):
        self._logger.debug("API: POST /self/spool")

        jsonData = flask.request.json
        self._logger.debug("Request JSON: %s", jsonData)

        toolId = self._getIntFromJSONOrNone("toolIdx", jsonData)
        spoolId = self._getStringFromJSONOrNone("spoolId", jsonData)
        self._logger.debug("toolId: %s, spoolId: %s", toolId, spoolId)

        spools = self._settings.get([SettingsKeys.SELECTED_SPOOL_IDS])
        self._logger.debug("Current active spools: %s", spools)

        # Initialize spools[toolId] if it doesn't exist
        if str(toolId) not in spools:
            spools[str(toolId)] = {}

        # Create a structure that will be compatible with the JavaScript code
        # The JavaScript code expects an object with a spoolId property that can be accessed
        # either as a function or as a property
        spools[str(toolId)] = {
            'spoolId': spoolId,
            'spoolId_observable': True  # Flag to indicate this is an observable in JavaScript
        }
        self._logger.debug("Updated active spools: %s", spools)

        self._settings.set([SettingsKeys.SELECTED_SPOOL_IDS], spools)
        self._settings.save()
        self._logger.debug("Settings saved")

        self.triggerPluginEvent(
            Events.PLUGIN_SPOOLMAN_SPOOL_SELECTED,
            {
                'toolIdx': toolId,
                'spoolId': spoolId,
            }
        )

        return flask.jsonify({
            "data": {}
        })
        
    @octoprint.plugin.BlueprintPlugin.route("/self/backup-spool", methods=["POST"])
    def handleUpdateBackupSpool(self):
        self._logger.debug("API: POST /self/backup-spool")

        jsonData = flask.request.json
        self._logger.debug("Request JSON: %s", jsonData)

        toolId = self._getIntFromJSONOrNone("toolIdx", jsonData)
        spoolId = self._getStringFromJSONOrNone("spoolId", jsonData)
        self._logger.debug("toolId: %s, spoolId: %s", toolId, spoolId)

        spools = self._settings.get([SettingsKeys.BACKUP_SPOOL_IDS])
        self._logger.debug("Current backup spools: %s", spools)

        # Initialize spools[toolId] if it doesn't exist
        if str(toolId) not in spools:
            spools[str(toolId)] = {}

        # Create a structure that will be compatible with the JavaScript code
        # The JavaScript code expects an object with a spoolId property that can be accessed
        # either as a function or as a property
        spools[str(toolId)] = {
            'spoolId': spoolId,
            'spoolId_observable': True  # Flag to indicate this is an observable in JavaScript
        }
        self._logger.debug("Updated backup spools: %s", spools)

        self._settings.set([SettingsKeys.BACKUP_SPOOL_IDS], spools)
        self._settings.save()
        self._logger.debug("Settings saved")

        self.triggerPluginEvent(
            Events.PLUGIN_SPOOLMAN_SPOOL_SELECTED,
            {
                'toolIdx': toolId,
                'spoolId': spoolId,
                'isBackup': True,
            }
        )

        return flask.jsonify({
            "data": {}
        })

    @octoprint.plugin.BlueprintPlugin.route("/self/current-job-requirements", methods=["GET"])
    def handleGetCurrentJobRequirements(self):
        self._logger.debug("API: GET /self/current-job-requirements")

        # TODO: Ideally, this should be pulled from cache
        getSpoolsAvailableResult = self.getSpoolmanConnector().handleGetSpoolsAvailable()

        if getSpoolsAvailableResult.get('error', False):
            response = flask.jsonify(getSpoolsAvailableResult)
            response.status = http.HTTPStatus.BAD_REQUEST

            return response

        spoolsAvailable = getSpoolsAvailableResult["data"]["spools"]

        jobFilamentUsage = self.getCurrentJobFilamentUsage()

        if not jobFilamentUsage["jobHasFilamentLengthData"]:
            return flask.jsonify({
                "data": {
                    "isFilamentUsageAvailable": False,
                    "tools": {},
                },
            })

        selectedSpools = self._settings.get([SettingsKeys.SELECTED_SPOOL_IDS])

        filamentUsageDataPerTool = PrinterUtils.getFilamentUsageDataPerTool(
            filamentLengthPerTool = jobFilamentUsage['jobFilamentLengthsPerTool'],
            selectedSpoolsPerTool = selectedSpools,
            spoolsAvailable = spoolsAvailable,
        )

        return flask.jsonify({
            "data": {
                "isFilamentUsageAvailable": True,
                "tools": filamentUsageDataPerTool,
            },
        })
