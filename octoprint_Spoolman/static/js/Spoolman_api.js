const createApi = () => {
    // from setup.py plugin_identifier
    const PLUGIN_ID = "Spoolman";

    const cache = new PromiseCache();
    const apiClient = new APIClient(PLUGIN_ID, BASEURL);

    const sharedGetSpoolmanSpools = async () => {
        const request = await getSpoolmanSpools(apiClient);

        if (!request.isSuccess) {
            console.error("Request error", request.error);
        }

        return request;
    };
    const cacheGetSpoolmanSpoolsResult = cache.registerResource("getSpoolmanSpools", {
        getter: sharedGetSpoolmanSpools,
    });
    const sharedGetCurrentJobRequirements = async () => {
        const request = await getCurrentJobRequirements(apiClient);

        if (!request.isSuccess) {
            console.error("Request error", request.error);
        }

        return request;
    };
    /**
     * @param {Parameters<typeof updateActiveSpool>[1]} params
     */
    const sharedUpdateActiveSpool = async ({ toolIdx, spoolId }) => {
        const request = await updateActiveSpool(apiClient, { toolIdx, spoolId });

        if (!request.isSuccess) {
            console.error("Request error", request.error);
        }

        return request;
    };

    /**
     * @param {{ toolIdx: number, spoolId: string|undefined }} params
     */
    const sharedUpdateBackupSpool = async ({ toolIdx, spoolId }) => {
        console.log("sharedUpdateBackupSpool called with params:", { toolIdx, spoolId });
        try {
            const response = await OctoPrint.postJson(
                "plugin/Spoolman/self/backup-spool",
                {
                    toolIdx: toolIdx,
                    spoolId: spoolId,
                }
            );

            return {
                isSuccess: true,
                payload: {
                    response: response,
                },
            };
        } catch (error) {
            console.error("Request error", error);
            return {
                isSuccess: false,
                error: {
                    response: error.responseJSON,
                },
            };
        }
    };

    if (!cacheGetSpoolmanSpoolsResult.isSuccess) {
        throw new Error('[Spoolman][api] Could not create cached "getSpoolmanSpools"');
    }

    const pluginSpoolmanApiNamespace = {
        cache,

        /** @type {typeof sharedGetSpoolmanSpools & { invalidate: CachedGetterFn['invalidate'] }} */
        // @ts-ignore
        getSpoolmanSpools: cacheGetSpoolmanSpoolsResult.getter,
        getCurrentJobRequirements: sharedGetCurrentJobRequirements,
        updateActiveSpool: sharedUpdateActiveSpool,
        updateBackupSpool: sharedUpdateBackupSpool,
    };

    /**
     * @typedef {typeof pluginSpoolmanApiNamespace} PluginSpoolmanApiType
     */

    // @ts-ignore
    window.pluginSpoolmanApi = pluginSpoolmanApiNamespace;

    return {
        pluginSpoolmanApiNamespace,
    };
};

$(createApi);

/**
 * @typedef {ReturnType<typeof createApi>['pluginSpoolmanApiNamespace']} PluginSpoolmanApiType
 */
