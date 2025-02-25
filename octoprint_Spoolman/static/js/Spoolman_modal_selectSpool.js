$(() => {
    // from setup.py plugin_identifier
    const PLUGIN_ID = "Spoolman";

    const SpoolmanModalSelectSpoolComponent = {
        registerComponent: () => {
            ko.components.register('spoolman-modal-select-spool', {
                viewModel: SpoolmanModalSelectSpoolViewModel,
                template: {
                    element: 'spoolman-modal-selectSpool-template',
                },
            });
        },
        modalSelector: "#spoolman_modal_selectspool",
    }

    window.SpoolmanModalSelectSpoolComponent = SpoolmanModalSelectSpoolComponent;

    // TODO: Add support for multi-targetting
    function SpoolmanModalSelectSpoolViewModel(params) {
        const self = this;

        self.settingsViewModel = params.settingsViewModel;
        self.eventsSink = params.eventsSink;

        self._isVisible = false;

        self.modals = {
            selectSpool: $(SpoolmanModalSelectSpoolComponent.modalSelector),
        };

        const getPluginSettings = () => {
            return self.settingsViewModel().settings.plugins[PLUGIN_ID];
        };

        const refreshModalLayout = () => {
            self.modals.selectSpool.modal("layout");
        };

        const refreshView = async () => {
            if (!self._isVisible) {
                return;
            }

            // TODO: Add error handling for modal

            const toolIdx = self.templateData.toolIdx();
            const isBackup = self.templateData.isBackup();

            self.templateData.loadingError(undefined);
            self.templateData.isLoadingData(true);

            refreshModalLayout();

            const spoolmanSpoolsResult = await pluginSpoolmanApi.getSpoolmanSpools();

            self.templateData.isLoadingData(false);

            if (!spoolmanSpoolsResult.isSuccess) {
                self.templateData.loadingError(spoolmanSpoolsResult.error.response.error)

                return;
            }

            const spoolmanSpools = spoolmanSpoolsResult.payload.response.data.spools;

            // Get the current spool ID based on whether we're selecting a primary or backup spool
            const spoolIdsSettings = isBackup ? getPluginSettings().backupSpoolIds : getPluginSettings().selectedSpoolIds;
            const toolSpoolId = spoolIdsSettings[toolIdx]?.spoolId();
            const toolSpool = spoolmanSpools.find((spool) => {
                return String(spool.id) === toolSpoolId;
            });

            const spoolmanSafeSpools = spoolmanSpools.map((spool) => {
                return {
                    ...toSafeSpool(spool),
                    displayData: toSpoolForDisplay(spool, { constants: self.constants }),
                };
            });

            self.templateData.toolCurrentSpoolId(toolSpoolId);
            self.templateData.toolCurrentSpool(
                toolSpool
                    ? {
                        ...toSafeSpool(toolSpool),
                        displayData: toSpoolForDisplay(toolSpool, { constants: self.constants }),
                    }
                    : undefined
            );
            self.templateData.tableItemsOnCurrentPage(spoolmanSafeSpools);

            self.templateData.spoolmanUrl(getPluginSettings().spoolmanUrl());

            self.templateData.tableAttributeVisibility.lot(Boolean(getPluginSettings().showLotNumberColumnInSpoolSelectModal()));

            // Update modal title based on whether we're selecting a primary or backup spool
            self.templateData.modalTitle(isBackup ? "Select Backup Spool" : "Select Spool");

            refreshModalLayout();
        };

        /**
         * @param {number} toolIdx
         * @param {boolean} isBackup
         */
        const handleDisplayModal = async (toolIdx, isBackup) => {
            self.templateData.toolIdx(toolIdx);
            self.templateData.isBackup(isBackup);

            await refreshView();
        };

        /**
         * @param {number} toolIdx
         * @param {number} spoolId
         */
        const handleSelectSpoolForTool = async (toolIdx, spoolId) => {
            let request;
            
            if (self.templateData.isBackup()) {
                request = await pluginSpoolmanApi.updateBackupSpool({ toolIdx, spoolId });
            } else {
                request = await pluginSpoolmanApi.updateActiveSpool({ toolIdx, spoolId });
            }

            // TODO: Add error handling for modal
            if (!request.isSuccess) {
                return;
            }

            await reloadSettingsViewModel(self.settingsViewModel());

            self.modals.selectSpool.modal("hide");

            self.eventsSink({
                type: 'onSelectSpoolForTool',
                isBackup: self.templateData.isBackup(),
            });
        };

        const handleForceRefresh = async () => {
            pluginSpoolmanApi.getSpoolmanSpools.invalidate();
        };
        const handleTryAgainOnError = async () => {
            await handleForceRefresh();
        };

        /** Bindings for the template */
        self.constants = {
            weight_unit: 'g',
        };
        self.templateApi = {
            handleSelectSpoolForTool,
            handleTryAgainOnError,
            handleForceRefresh,
        };
        self.templateData = {
            isLoadingData: ko.observable(true),
            loadingError: ko.observable(undefined),

            toolIdx: ko.observable(undefined),
            isBackup: ko.observable(false),
            toolCurrentSpoolId: ko.observable(undefined),
            toolCurrentSpool: ko.observable(undefined),
            modalTitle: ko.observable("Select Spool"),

            tableAttributeVisibility: {
                id: true,
                spoolName: true,
                material: true,
                lot: ko.observable(Boolean(getPluginSettings().showLotNumberColumnInSpoolSelectModal())),
                weight: true,
            },
            tableItemsOnCurrentPage: ko.observable([]),

            spoolmanUrl: ko.observable(undefined),
        };
        /** -- end of bindings -- */

        $(document).on("shown", SpoolmanModalSelectSpoolComponent.modalSelector, async () => {
            this._isVisible = true;

            await handleDisplayModal(params.toolIdx(), params.isBackup());
        });
        $(document).on("hidden", SpoolmanModalSelectSpoolComponent.modalSelector, async () => {
            this._isVisible = false;
        });

        const init = () => {
            pluginSpoolmanApi.cache.onResourcesInvalidated([ "getSpoolmanSpools" ], () => {
                void refreshView();
            });
        };

        init();
    };
});
