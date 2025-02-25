$(() => {
    console.log("Loading updateBackupSpool API");
    window.pluginSpoolmanApi = window.pluginSpoolmanApi || {};

    /**
     * @param {Object} params
     * @param {number} params.toolIdx
     * @param {string|undefined} params.spoolId
     * @returns {Promise<{
     *  isSuccess: boolean,
     *  payload?: {
     *      response: {
     *          data: {}
     *      }
     *  },
     *  error?: {
     *      response: {
     *          error: {
     *              code: string,
     *              message: string,
     *              data?: any
     *          }
     *      }
     *  }
     * }>}
     */
    window.pluginSpoolmanApi.updateBackupSpool = async (params) => {
        console.log("updateBackupSpool called with params:", params);
        try {
            const response = await OctoPrint.postJson(
                "plugin/Spoolman/self/backup-spool",
                {
                    toolIdx: params.toolIdx,
                    spoolId: params.spoolId,
                }
            );

            return {
                isSuccess: true,
                payload: {
                    response: response,
                },
            };
        } catch (error) {
            return {
                isSuccess: false,
                error: {
                    response: error.responseJSON,
                },
            };
        }
    };
});
