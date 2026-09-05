
## de.innogames.shared.networking.AbstractConnectionService  (L13101-L13123)
- serviceName: **null**  super: de_innogames_networking_services_NetConnectionService
- `postConstruct()`
- `get_serviceName()`
- `dispatch(event)`

## de.innogames.strategycity.main.service.CityProductionService  (L13124-L13204)
- serviceName: **CityProductionService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getProductionQueue -> _onGetProductionQueue
- `get_serviceName()`
- `cancelProduction(entityId,slotId)` → `cancelProduction.withData([entityId,slotId])`
- `discardProduction(entityId,forceCleanStorage)` → `discardProduction.withData([entityId,forceCleanStorage])`
- `pickupProduction(entityId,callback)`
- `pickupProductionDetails(entityIds,callback)` [10 lines]
- `instantStart(entityId,productionOptionId,productionAmount)` → `instantStart.withData([entityId,productionOptionId,productionAmount]).immediate()`
- `startProduction(entityId,productionOptionId,productionAmount)` → `startProduction.withData([entityId,productionOptionId,productionAmount]).handleOnlyLastPushResponses(["CityResourcesService" + "." + "getResources"])`
- `startProductions(buildingIds,optionId,amount)` → `startProductions.withData([buildingIds,optionId,amount]).handleOnlyLastPushResponses(["CityResourcesService" + "." + "getResources"])`
- `instantFinish(entityId)` → `instantFinish.withData([entityId]).immediate()`
- `updateQueue(queueId)` → `getProductionQueue.withData([queueId]).immediate()`
- `addSafePushResponse(response,callback)`
- `_onGetProductionQueue(productionQueue)`
- `_pickupProduction(callback)` → `pickupProduction.withData([this._pickupEntities.splice(0,this._pickupEntities.length)]).withCallback(callback).immediate()`
- `_pickupProductionDetails(callback)` → `pickupProductionDetails.withData([this._pickupEntitiesDetails.splice(0,this._pickupEntitiesDetails.length)]).withCallback(callback).immediate()`

## de.innogames.onyx.city.service.OtherPlayerService  (L14496-L14519)
- serviceName: **OtherPlayerService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updatePlayer -> _onPlayerUpdate
- `get_serviceName()`
- `visitPlayer(playerId,callback)` → `visitPlayer.withData([playerId]).withCallback(callback).immediate()`
- `getNeighbourlyHelpBuildings(playerId,callback)` → `getNeighbourlyHelpBuildings.withData([playerId]).withCallback(callback).immediate()`
- `_onPlayerUpdate(list)`

## de.innogames.onyx.networking.services.ManifestService  (L15476-L15495)
- serviceName: **ManifestService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getManifests()` → `getManifests (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.StartupService  (L17105-L17127)
- serviceName: **StartupService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getCrmData()` → `getCrmData (complex)`
- `getData()` → `getData (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.spire.service.SpireDiplomacyService  (L21010-L21033)
- serviceName: **SpireDiplomacyService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `submit(pointId,chosenOptions,turnNumber,callback)` → `submit.immediate().withData([pointId,chosenOptions,turnNumber]).withCallback(callback)`
- `getData(pointId,callback)` → `getData.immediate().withData([pointId]).withCallback(callback)`
- `cancelDiplomacy(pointId)` → `cancel.immediate().withData([pointId])`
- `buyExtraTurn(pointId,boughtTurn,callback)` → `buyExtraTurn.immediate().withData([pointId,boughtTurn]).withCallback(callback)`

## de.innogames.onyx.city.ancientwonders.services.AncientWonderService  (L21107-L21163)
- serviceName: **AncientWonderService**  super: de_innogames_shared_networking_AbstractConnectionService
- `getContributions()` → `getContributions (complex)`
- `addSafePushResponse(response,callback)`
- `get_serviceName()`
- `getPhase(playerId,entityId)` → `getOtherPlayerAncientWonders (complex)`
- `getPhases(playerId)` → `getPhases (complex)`
- `insertRuneShard(entityBaseName)` → `insertRuneShard.withData([entityBaseName]).immediate()`
- `investKnowledgePoints(playerId,entityBaseName,amount)` → `investKnowledgePoints.withData([playerId,entityBaseName,amount])`
- `investRuneShards(playerId,entityBaseName,amount)` → `investKnowledgePointsBasedOnRuneShards.withData([playerId,entityBaseName,amount])`
- `investGuildProgressionFreeKp(playerId,entityBaseName)` → `investGuildProgressionFreeKp.withData([playerId,entityBaseName])`
- `useBrokenShards(entityBaseName,callback)` → `useBrokenShards.withCallback(callback).withData([entityBaseName]).immediate()`
- `payBrokenShards(entityBaseName,callback)` → `payBrokenShards.withCallback(callback).withData([entityBaseName]).parseLastResponse()`
- `getOtherPlayerAncientWonders(playerId,callback)` → `getOtherPlayerAncientWonders.withCallback(callback).withData([playerId]).parseLastResponse()`
- `updateFavourite(playerId,entityBaseName,isFavorite)` → `updateFavourite.withData([playerId,entityBaseName,isFavorite]).immediate()`
- `_onShowHelpReward(vos)`

## de.innogames.onyx.spire.service.SpireBattleService  (L22575-L22610)
- serviceName: **SpireBattleService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `instantBattle(pointId,unitSquads,callback)` → `instantBattle.withData([pointId,de_innogames_onyx_spire_service_SpireBattleService._getUnitsVO(unitSquads)]).withCallback(callback).immediate()`
- `startBattle(pointId,unitSquads,callback)` → `startBattle.withData([pointId,de_innogames_onyx_spire_service_SpireBattleService._getUnitsVO(unitSquads)]).withCallback(callback).immediate()`
- `instantNextWave(battleId,callback)` → `instantNextWave.withData([battleId]).withCallback(callback).immediate()`
- `startNextWave(battleId,callback)` → `startNextWave.withData([battleId]).withCallback(callback).immediate()`
- `getBattle(battleId,callback)` → `getBattle.withData([battleId]).withCallback(callback).immediate()`

## de.innogames.onyx.city.mainevents.shared.services.MergeEventService  (L23179-L23224)
- serviceName: **MergeEventService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: initializeBoard -> onInitializeBoard; updateBoard -> onUpdateBoard
- `getOverview()` → `getOverview.immediate()`
- `getOrders(callback)` → `getOrders.immediate().withCallback(callback)`
- `generate(chestIds)` → `generate.withData([chestIds]).immediate()`
- `move(fromPosition,toPosition)` → `move.withData([fromPosition,toPosition]).immediate()`
- `discard(position)` → `discard.withData([position]).immediate()`
- `completeOrder(chestId,callback)` → `completeOrder.withData([chestId]).withCallback(callback).immediate()`
- `discardOrder(chestId)` → `discardOrder.withData([chestId]).immediate()`
- `instantSkipOrderCooldown(slot)` → `instantSkipOrderCooldown.withData([slot]).immediate()`
- `get_serviceName()`
- `onInitializeBoard(vo)`
- `onUpdateBoard(vo)`

## de.innogames.onyx.spire.service.SpireService  (L24590-L24636)
- serviceName: **SpireService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateMap -> _onUpdateMap
- `get_serviceName()`
- `getData(callback)` → `getData.immediate().withCallback(callback)`
- `getEncounter(pointId,callback)` → `getEncounter.withData([pointId]).immediate().withCallback(callback)`
- `buyUnits(pointId,unitId,callback)` → `buyUnits.withData([pointId,unitId]).immediate().withCallback(callback)`
- `openChest(pointId,callback)` → `openChest.withData([pointId]).immediate().withCallback(callback)`
- `instantOpenGate(pointId,callback)` → `instantOpenGate.withData([pointId]).immediate().withCallback(callback)`
- `openGate(pointId,callback)` → `openGate.withData([pointId]).immediate().withCallback(callback)`
- `openMysteryChest(chestLocationId,callback)` → `openMysteryChest.withData([chestLocationId]).immediate().withCallback(callback)`
- `getArchivePoints()` → `getPointsArchive`
- `unlockNextCrystalWithArchivePoints(archivePoints)` → `unlockCrystalByArchive.withData([archivePoints])`
- `addSafePushResponse(response,callback)`
- `_onUpdateMap(vo)`

## de.innogames.onyx.networking.services.LogService  (L31228-L31292)
- serviceName: **LogService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `logGameLogin(loadingTime)` → `logGameLogin.withData([loadingTime])`
- `logPerformanceMetrics(vo)` → `logPerformanceMetrics.withData([vo])`
- `trackAppLifeCycle(step)` → `trackAppLifeCycle.withData([step])`
- `trackCrossSell(deviceId,campaignId)` → `trackCrossSell.withData([deviceId,campaignId])`
- `trackDownloadFinishSize(downloadCategory,retryCounter,elapsedTime,size)` → `trackDownloadFinishSize.withData([downloadCategory,retryCounter,elapsedTime,size])`
- `trackDownloadStartSize(downloadCategory,size)` → `trackDownloadStartSize.withData([downloadCategory,size])`
- `trackDownloadStopSize(downloadCategory,reason,size)` → `trackDownloadStopSize.withData([downloadCategory,reason,size])`
- `trackEventWindowOpen(type)` → `trackEventWindowOpen.withData([type])`
- `trackGameStartup(stepName)` → `trackGameStartup.withData([stepName])`
- `trackInstallSize(installSize,freeSpace)` → `trackInstallSize.withData([installSize,freeSpace])`
- `trackRatingScreen(action)` → `trackRatingScreen.withData([action])`
- `trackShopCancel(sessionId)` → `trackShopCancel.withData([sessionId])`
- `trackShopClose()` → `trackShopClose.withData([])`
- `trackShopError(sessionId,type,errorCode,message)` → `trackShopError.withData([sessionId,type,errorCode,message])`
- `trackShopOpen(sessionId)` → `trackShopOpen.withData([sessionId])`
- `trackSocketConnection(method)` → `trackSocketConnection.withData([method])`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.city.ui.windows.academy.crafting.services.CraftService  (L36706-L36752)
- serviceName: **CraftService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateActiveRecipe -> _onUpdateActiveRecipe; updateProgress -> _onUpdateProgress
- `get_serviceName()`
- `getCraftingData()` → `getCraftingData.immediate().withCallback($bind(this,this._onUpdateData))`
- `craft(recipeId)` → `startCrafting.withData([recipeId]).immediate()`
- `premiumCraft(recipeId)` → `startPremiumCrafting.withData([recipeId]).immediate()`
- `collectCraftedItem(callback)` → `collectCraftedItems.withCallback(callback).immediate()`
- `instantFinish()` → `instantFinish.immediate()`
- `cancelCrafting()` → `cancelCrafting.immediate()`
- `instantGetSlots()` → `instantRefreshSlots.withCallback($bind(this,this._onUpdateData)).immediate()`
- `collectChest(callback)` → `collectChestRewards.withCallback(callback).immediate()`
- `_onUpdateActiveRecipe(activeRecipeVO)`
- `_onUpdateProgress(progressVO)`
- `_onUpdateData(craftVO)`

## de.innogames.onyx.city.crm3.services.CRMService  (L36917-L36966)
- serviceName: **Crm3Service**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getInterstitials -> _onGetInterstitials; addInterstitial -> _onAddInterstitial; removeInterstitial -> _onRemoveInterstitial; executeCallToAction -> _onExecuteCallToAction
- `get_serviceName()`
- `acceptInterstitial(targetId,displayPoint,buttonIndex,callback)` → `acceptInterstitial.withData([targetId,displayPoint,buttonIndex]).withCallback(callback)`
- `rejectInterstitial(targetId,displayPoint)` → `rejectInterstitial.withData([targetId,displayPoint])`
- `markInterstitialSeen(targetId,displayPoint)` → `markInterstitialSeen.withData([targetId,displayPoint])`
- `isValidPlatform(platforms)`
- `_onGetInterstitials(vos)`
- `_onAddInterstitial(vo)`
- `_onRemoveInterstitial(targetId)`
- `_onExecuteCallToAction(vo)`

## de.innogames.onyx.networking.services.CashShopService  (L37187-L37212)
- serviceName: **CashShopService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getCashShopConfig()` → `getCashShopConfig (complex)`
- `getProducts()` → `getProducts (complex)`
- `getPurchaseLink(productId)` → `getPurchaseLink (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.resources.service.ResourcesService  (L42743-L42798)
- serviceName: **CityResourcesService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: buyResourcePackage -> _onBuyResourcePackage; updateResourceConfigs -> _onUpdateResourceConfigs; updateResourceCaps -> _onResourceCapUpdate; getResources -> _onGetResources; getPremium -> _onGetPremium
- `get_serviceName()`
- `buyResourcePackage(id,ownerId,data,callback)` → `buyResourcePackage.withData([id,ownerId,data != null ? data.toVo() : null]).immediate().withCallback(callback)`
- `buyAWInstantKP(kpAmount,ownerId,data,callback)` → `buyInstantAwKp.withData([kpAmount,ownerId,data.toVo()]).immediate().withCallback(callback)`
- `addSafePushResponse(response,callback)`
- `syncResources()` → `getResources.immediate().withCallback($bind(this,this._onGetResources))`
- `_onResourceCapUpdate(resource)`
- `_onGetResources(resources)`
- `_onGetPremium(premium)` [7 lines]
- `_onBuyResourcePackage(packages)`
- `_onUpdateResourceConfigs(vos)`

## de.innogames.strategycity.main.service.PostStartupService  (L44710-L44724)
- serviceName: **PostStartupService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getPostStartupData()` → `getPostStartupData.immediate()`

## de.innogames.onyx.city.inventoryitems.service.DisenchantService  (L49659-L49676)
- serviceName: **DisenchantService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `disenchantItems(inventoryItemId,count)` → `disenchantItems.withData([inventoryItemId,count]).immediate()`
- `disenchantSpells(inventoryItemId,count)` → `disenchantSpells.withData([inventoryItemId,count]).immediate()`

## de.innogames.onyx.networking.services.RewardSelectionKitService  (L49908-L49927)
- serviceName: **RewardSelectionKitService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `chooseOne(inventoryItemId,rewardIndex)` → `chooseOne (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.city.services.DiplomacyCancelService  (L50001-L50015)
- serviceName: **SpireDiplomacyService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `cancelDiplomacy(pointId)` → `cancel.immediate().withData([pointId])`

## de.innogames.onyx.city.ingameshop.services.InGameShopService  (L51390-L51411)
- serviceName: **InGameOfferService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getOffers(offerId)` → `getOffers (complex)`
- `buyOffer(offerId)` → `buyOffer (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.tournaments.services.WorldMapTournamentService  (L51465-L51502)
- serviceName: **TournamentService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateAllTournamentProvinces -> _onUpdateAllTournamentProvinces
- `get_serviceName()`
- `instantUpgrade(rowIndex,columnIndex,cost,callback)` → `instantUpgrade.withData([columnIndex,rowIndex,cost]).withCallback(callback).immediate()`
- `getProvincesOverview(callback)` → `getProvincesOverview.withCallback(callback)`
- `_onUpdateAllTournamentProvinces(vos)`
- `getArchivePoints()` → `getPointsArchive`
- `unlockNextChestWithArchivePoints(archivePoints)` → `unlockChestByArchive.withData([archivePoints]).withCallback($bind(this,this._onGetTournamentOverview))`
- `addSafePushResponse(response,callback)`
- `_onGetTournamentOverview(vo)`

## de.innogames.onyx.shared.quests.services.QuestMilestoneService  (L52834-L52852)
- serviceName: **QuestMilestoneService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateQuestMilestone -> _onUpdateQuestMilestone
- `get_serviceName()`
- `collectReward(callback)` → `collectReward.withCallback(callback).immediate()`
- `_onUpdateQuestMilestone(vo)`

## de.innogames.onyx.networking.services.AbsolutionService  (L57398-L57417)
- serviceName: **AbsolutionService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getData()` → `getData (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.spire.service.SpireStateService  (L58690-L58708)
- serviceName: **SpireStateService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getState()` → `getState.immediate()`
- `addSafePushResponse(response,callback)`

## de.innogames.strategycity.main.service.PlayerProfileService  (L61106-L61158)
- serviceName: **PlayerProfileService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getUnlockedAvatars -> _onUnlockedAvatars; getAllUnlockedAvatars -> _onAllUnlockedAvatars
- `get_serviceName()`
- `setCityName(name)` → `setCityName.withData([name])`
- `setPortraitId(portraitId)` → `setPortraitId.withData([portraitId])`
- `setEmailOptin(hasAcceptedEmails)` → `setEmailOptin.withData([hasAcceptedEmails]).immediate()`
- `_onUnlockedAvatars(avatars)` [10 lines]
- `_onAllUnlockedAvatars(avatars)` [10 lines]
- `_parseAvatarIds(avatars)` [9 lines]

## de.innogames.onyx.city.service.CityInformationService  (L66840-L66858)
- serviceName: **CityInformationService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getCulture()` → `getCulture.immediate()`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.EffectsService  (L68944-L68966)
- serviceName: **EffectsService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `refresh()` → `refresh.withData([])`
- `update()` → `update.withData([])`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.SupportService  (L69208-L69230)
- serviceName: **SupportService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getSupportUrl(data)` → `getSupportUrl (complex)`
- `getSupportUrlForClientData(device,data)` → `getSupportUrlForClientData (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.city.mainevents.seasonpass.services.SeasonPassService  (L80075-L80100)
- serviceName: **SeasonPassService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getSeasonPassReward -> onSeasonPassReward; getSeasonPassEndReward -> onSeasonPassEndReward
- `claimReward(level,rewardIndex,callback)` → `claimReward.withData([level,rewardIndex]).withCallback(callback).immediate()`
- `rerollQuest(questId)` → `rerollQuest.withData([questId]).immediate()`
- `get_serviceName()`
- `onSeasonPassReward(rewards)`
- `onSeasonPassEndReward(rewards)`

## de.innogames.onyx.networking.services.TreasureService  (L80840-L80865)
- serviceName: **TreasureService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getCurrencyEventTreasures()` → `getCurrencyEventTreasures (complex)`
- `openTreasure(type)` → `openTreasure (complex)`
- `refresh()` → `refresh.withData([])`
- `addSafePushResponse(response,callback)`

## de.innogames.strategycity.main.service.NewsService  (L84524-L84564)
- serviceName: **NewsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: fetchNews -> _onFetchNews
- `get_serviceName()`
- `trackNews(news,trackType,tab)` → `trackNews (complex)` [12 lines]
- `_createTrackVO(news,action,tab)` [10 lines]
- `_onFetchNews(news)`

## de.innogames.onyx.battle.services.BattleService  (L361363-L361384)
- serviceName: **BattleService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `submitStep(battleId,step,isAutoBattle,callback)` → `submit.withData([battleId,step,isAutoBattle]).withCallback(callback).immediate()`
- `surrenderBattle(battleId,callback)` → `surrender.withData([battleId]).withCallback(callback).immediate()`
- `getBattle(battleId,callback)` → `getBattle.withData([battleId]).withCallback(callback).immediate()`

## de.innogames.onyx.chests.services.ChestsService  (L370997-L371053)
- serviceName: **ChestsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateUnavailableChests -> _onUpdateUnavailableChests; updateChestPayInProgress -> _onUpdateChestsPayInProgress; updateChestContributions -> _onUpdateChestContributions; getEventChestRotation -> _onGetEventChestRotation
- `get_serviceName()`
- `openChest(chestId,callback)` → `openChest.withData([chestId]).withCallback(callback).immediate()`
- `openChestAndCollect(chestId,seasonalEventId,callback)` → `openChestAndCollect.withData([chestId,seasonalEventId]).withCallback(callback).immediate()`
- `payIn(chestId,amount,callback)` → `payIn.withData([chestId,amount]).withCallback(callback).immediate()`
- `payInWithPremium(chestId,amount,premiumCosts,callback)` → `payInWithPremium.withData([chestId,amount,premiumCosts]).withCallback(callback).immediate()`
- `getEventChestRotation(seasonalEventId)` → `getEventChestRotation.withData([seasonalEventId]).withCallback($bind(this,this._onGetEventChestRotation)).immediate()`
- `_onUpdateUnavailableChests(ids)`
- `_onUpdateChestsPayInProgress(vos)`
- `_onUpdateChestContributions(vos)`
- `_onGetEventChestRotation(vos)` [10 lines]

## de.innogames.onyx.city.challengeevents.services.ChallengeEventService  (L383965-L383981)
- serviceName: **ChallengeEventService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getMilestoneRewards -> _onGetMilestoneRewards
- `get_serviceName()`
- `_onGetMilestoneRewards(rewards)`

## de.innogames.onyx.city.inventoryitems.service.InventoryService  (L416999-L417036)
- serviceName: **InventoryService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateItems -> _onUpdateItems
- `get_serviceName()`
- `getItems()` → `getItems.immediate()`
- `placeBuilding(inventoryItemId,x,y,callback)` → `placeBuilding.withData([inventoryItemId,x,y]).withCallback(callback).immediate()`
- `useItem(itemId)` → `useItem.withData([itemId]).immediate()`
- `useItemOn(itemId,targetVO)` → `useItemOn.withData([itemId,targetVO]).immediate()`
- `_getInventoryItems(vos)`
- `_onUpdateItems(vos)`

## de.innogames.onyx.city.mainevents.eventleague.services.EventLeagueService  (L423612-L423635)
- serviceName: **EventLeagueService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateEventLeagueProgress -> _onUpdateEventLeagueProgress; sendEventLeagueEndReward -> _onSendEventLeagueEndReward
- `get_serviceName()`
- `getLeagueProgress()` → `getEventLeagueProgress.immediate()`
- `_onUpdateEventLeagueProgress(vo)`
- `_onSendEventLeagueEndReward(vo)`

## de.innogames.onyx.city.mainevents.royalpass.services.RoyalPassService  (L427263-L427291)
- serviceName: **RoyalPassService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: sendRoyalPassEndRewards -> _onSendRoyalPassEndRewards
- `claimAllRewards(callback)` → `claimAllRewards.withCallback(callback).immediate()`
- `claimNextGrandPrize(callback)` → `claimNextGrandPrize.withCallback(callback).immediate()`
- `claimNextRoyalPrize(callback)` → `claimNextRoyalPrize.withCallback(callback).immediate()`
- `get_serviceName()`
- `_onSendRoyalPassEndRewards(rewards)`

## de.innogames.onyx.city.mainevents.shared.services.ShuffleEventService  (L444320-L444345)
- serviceName: **ShuffleEventService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateShuffleEvent -> _onUpdate
- `get_serviceName()`
- `getPackages()` → `getOverview.withCallback($bind(this,this._onUpdate)).immediate()`
- `shufflePackages()` → `shuffle.withCallback($bind(this,this._onUpdate)).immediate()`
- `openPackage(position,callback)` → `openPackage.withData([position]).withCallback(callback).immediate()`
- `_onUpdate(vo)`

## de.innogames.onyx.city.mainevents.shared.services.TileEventService  (L444346-L444401)
- serviceName: **TileEventService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateCells -> onUpdateCells; addColumn -> onAddColumn; autoCollectRewards -> onAutoCollectRewards; updateRevealChargePositions -> onUpdateRevealChargePositions
- `get_serviceName()`
- `getTileEvent()` → `getTileEvent.withCallback($bind(this,this.onGetTileEvent)).immediate()`
- `useTool(toolId,cellX,cellY)` → `useTool.withData([toolId,cellX,cellY]).immediate()`
- `collectReward(cellX,cellY,callback)` → `collectReward.withData([cellX,cellY]).withCallback(callback).immediate()`
- `onGetTileEvent(vo)`
- `onUpdateCells(vos)` [8 lines]
- `onAddColumn(vos)` [8 lines]
- `onAutoCollectRewards(vo)`
- `onUpdateRevealChargePositions(vos)`

## de.innogames.onyx.city.offers.services.OfferService  (L457719-L457738)
- serviceName: **OfferService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: refreshActiveOffers -> _onOffersUpdated
- `get_serviceName()`
- `_onOffersUpdated(vos)`

## de.innogames.onyx.city.service.NeighborlyHelpService  (L458768-L458789)
- serviceName: **NeighbourlyHelpService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `performAction(action,entityId,playerId)` → `performHelp.withData([action,entityId,playerId]).immediate()`
- `pickup(entityIds)` → `pickup.withData([entityIds])`
- `updateEntityCultureEffect(playerId)` → `updateEntityCultureEffect.withData([playerId])`

## de.innogames.onyx.city.service.NotificationService  (L458790-L458816)
- serviceName: **NotificationService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getGlobalNotifications -> _onGlobalNotifications
- `get_serviceName()`
- `cleanPendingNotifications(scope,callback)` → `cleanPendingNotifications.withData([scope]).withCallback(callback)`
- `getAllNotifications(callback)` → `getAllNotifications.withCallback(callback)`
- `getNotificationPreviews(playerId,callback)` → `getPreviewNotifications.withData([playerId]).withCallback(callback)`
- `_onGlobalNotifications(notifications)`

## de.innogames.onyx.city.services.BattleRetreatService  (L458817-L458832)
- serviceName: **BattleService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `retreatBattle(battleId,callback)` → `retreat.withData([battleId]).withCallback(callback).immediate()`

## de.innogames.onyx.city.services.CityMapService  (L458833-L458921)
- serviceName: **CityMapService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateExpansions -> _onUpdateExpansions; replaceBuilding -> _onReplaceEntity; updateEntity -> _onUpdateEntity; reset -> _onResetEntities
- `get_serviceName()`
- `placeEntity(entity,isPremium,callback)` → `placeBuildingForPremium.withData([entity.get_entityConfig().get_id(),entity.get_x(),entity.get_y()]).withCallback(callback).immediate()`, `placeBuilding.withData([entity.get_entityConfig().get_id(),entity.get_x(),entity.get_y()]).withCallback(callback)` [10 lines]
- `replaceEntities(entities,callback)` → `replaceBuildings.withData([entities]).withCallback(callback)`
- `removeEntity(entity,callback)` → `removeBuilding.withData([entity.get_id()]).withCallback(callback)`
- `moveEntity(entity,callback)` → `moveBuilding.withData([entity.get_id(),entity.get_x(),entity.get_y()]).immediate().withCallback(callback)`
- `upgradeEntity(entity,isPremium,callback)` → `upgradeBuildingForPremium.withData([entity.get_id(),entity.get_x(),entity.get_y()]).withCallback(callback).immediate()`, `upgradeBuilding.withData([entity.get_id(),entity.get_x(),entity.get_y()]).withCallback(callback).immediate()` [10 lines]
- `cancelUpgrade(entity,callback)` → `cancelUpgrade.withData([entity.get_id(),entity.get_x(),entity.get_y()]).withCallback(callback).immediate()`
- `unlockArea(tileX,tileY,expansionConfig,callback)` → `unlockArea.withData([tileX,tileY,expansionConfig.get_unlockedThrough(),expansionConfig.get_buyForPremium()]).withCallback(callback)`
- `reduceConstructionTime(mapEntityId,price,callback)` → `reduceConstructionTime.withData([mapEntityId,price]).withCallback(callback)`
- `update()` → `update`
- `_onReplaceEntity(vo)`
- `_onUpdateEntity(entities)`
- `_onResetEntities(entities)` [9 lines]
- `_onUpdateExpansions(expansions)` [13 lines]

## de.innogames.onyx.city.trade.services.MerchantService  (L462247-L462275)
- serviceName: **MerchantService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateMerchants -> _onUpdateMerchants
- `get_serviceName()`
- `getMerchants()` → `getMerchants.immediate()`
- `hireMerchant(merchantId)` → `hireMerchant.withData([merchantId]).immediate()`
- `finishCooldown(merchantId)` → `finishCooldown.withData([merchantId]).immediate()`
- `trade(merchantId,offer,demand,callback)` → `trade.withData([merchantId,de_innogames_onyx_resources_util_ResourceConverter.toCityGoodVO(offer),de_innogames_onyx_resources_util_ResourceConverter.toCityGoodVO(demand)]).withCallback(callback)`
- `_onUpdateMerchants(merchants)`

## de.innogames.onyx.city.trade.services.TradeService  (L462276-L462309)
- serviceName: **TradeService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `acceptWholesalerTrade(tradeId,callback)` → `acceptNpcOffer.withData([tradeId]).withCallback(callback).immediate()`
- `acceptPlayerTrade(tradeId,callback)` → `acceptPlayerTrade.withData([tradeId]).withCallback(callback)`
- `cancelTrade(tradeId,callback)` → `cancelTrade.withData([tradeId]).immediate().withCallback(callback)`
- `createTrade(offer,need,callback)` → `createTrade.withData([de_innogames_onyx_resources_util_ResourceConverter.toCityGoodVO(offer),de_innogames_onyx_resources_util_ResourceConverter.toCityGoodVO(need)]).withCallback(callback)`
- `getNPCTrades(callback)` → `getNPCOffers.withCallback(callback)`
- `getOtherPlayersTrades(callback)` → `getOtherPlayersTrades.withCallback(callback)`
- `getOwnPlayerTrades(callback)` → `getOwnPlayerTrades.withCallback(callback)`

## de.innogames.onyx.city.ui.windows.academy.cauldron.services.CauldronService  (L481454-L481497)
- serviceName: **CauldronService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getData -> _onUpdateData; getLastUsedGobletResult -> _onGetLastUsedGobletResult
- `get_serviceName()`
- `getIngredientList()` → `getIngredients (complex)`
- `brew(ingredientList,spellFragmentUsed,premiumBoost)` → `brew.withData([ingredientList,spellFragmentUsed,premiumBoost]).immediate()`
- `confirmGobletEffect(id)` → `confirmGobletEffect.withData([id]).immediate()`
- `getPotionEffectsList()` → `getPotionEffects (complex)`
- `getConvertableResourceList()` → `getResources (complex)`
- `investWitchPoints(potionEffectId,witchPointsCost)` → `investWitchPoints (complex)`
- `convertToWitchPoints(resourceId,convertNum)` → `trade.withData([resourceId,convertNum]).immediate()`
- `_onUpdateData(vo)`
- `_onGetLastUsedGobletResult(vo)`

## de.innogames.onyx.cmp.services.CmpService  (L512187-L512204)
- serviceName: **CmpService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `storeConsentToken(consentToken,controllerId)` → `storeConsentToken.withData([consentToken,controllerId]).immediate()`
- `trackOpenConsentPopup()` → `trackOpenConsentPopup.immediate()`

## de.innogames.onyx.miners.service.GoldMineService  (L519450-L519465)
- serviceName: **GoldMineService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `mine(province,callback)` → `mine.withData([province.get_columnIndex(),province.get_rowIndex()]).withCallback(callback)`

## de.innogames.onyx.multiplayer.services.MultiplayerService  (L520801-L520854)
- serviceName: **MultiplayerEventService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateOverview -> onUpdateOverview; updateWaypoints -> onUpdateWaypoints; unlockStageReward -> onUnlockStageRewards; getMultiplayerEventReward -> onGetMultiplayerEventReward; updateContributors -> onUpdateContributors
- `get_serviceName()`
- `getOverview()` → `getOverview.immediate()`
- `openWaypoint(waypointId)` → `openWaypoint.withData([waypointId]).immediate()`
- `collectStageReward()` → `collectStageReward.immediate()`
- `selectPath(path)` → `selectPath.withData([path]).immediate()`
- `createWaypoints(vos)`
- `onUpdateOverview(vo)`
- `onUpdateWaypoints(vos)`
- `onUnlockStageRewards(vo)`
- `onGetMultiplayerEventReward(rewards)`
- `onUpdateContributors(vo)`

## de.innogames.onyx.networking.services.CraftService  (L523796-L523842)
- serviceName: **CraftService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `cancelCrafting()` → `cancelCrafting.withData([])`
- `collectChestRewards()` → `collectChestRewards (complex)`
- `collectCraftedItem()` → `collectCraftedItem (complex)`
- `collectCraftedItems()` → `collectCraftedItems (complex)`
- `getCraftingData()` → `getCraftingData (complex)`
- `instantFinish()` → `instantFinish.withData([])`
- `instantRefreshSlots()` → `instantRefreshSlots (complex)`
- `startCrafting(recipeId)` → `startCrafting.withData([recipeId])`
- `startPremiumCrafting(recipeId)` → `startPremiumCrafting.withData([recipeId])`
- `trackHighlightsOpened()` → `trackHighlightsOpened.withData([])`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.FeaturesService  (L523852-L523871)
- serviceName: **FeaturesService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getFeatureFlags()` → `getFeatureFlags.withData([])`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.GuardianService  (L523884-L523912)
- serviceName: **GuardianService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getCollection()` → `getCollection (complex)`
- `instantFinish(guardianId)` → `instantFinish (complex)`
- `summon(guardianId)` → `summon (complex)`
- `unsummon(guardianId)` → `unsummon (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.SpireEffectService  (L523961-L523986)
- serviceName: **SpireEffectService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getSelectionOptions(pointId)` → `getSelectionOptions (complex)`
- `reroll(pointId)` → `reroll (complex)`
- `select(pointId,effectConfigId)` → `select (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.SpireService  (L523987-L524030)
- serviceName: **SpireService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `buyUnits(pointId,unitId)` → `buyUnits (complex)`
- `getData()` → `getData (complex)`
- `getEncounter(pointId)` → `getEncounter (complex)`
- `getPointsArchive()` → `getPointsArchive (complex)`
- `instantOpenGate(pointId)` → `instantOpenGate (complex)`
- `openChest(pointId)` → `openChest (complex)`
- `openGate(pointId)` → `openGate (complex)`
- `openMysteryChest(chestLocationId)` → `openMysteryChest (complex)`
- `unlockCrystalByArchive(orbsNeededForCrystal)` → `unlockCrystalByArchive (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.SpireShopService  (L524031-L524053)
- serviceName: **SpireShopService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `buy(itemId)` → `buy (complex)`
- `getShop()` → `getShop (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.networking.services.TranscendenceService  (L524054-L524076)
- serviceName: **TranscendenceService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `extendTime(buildingId)` → `extendTime (complex)`
- `refresh(buildingId)` → `refresh (complex)`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.seasonalevents.services.SeasonalEventsService  (L545993-L546021)
- serviceName: **SeasonalEventsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getEvents -> onGetEvents
- `get_serviceName()`
- `confirmEventStarted(seasonalEventId)` → `confirmEventStarted.withData([seasonalEventId]).immediate()`
- `confirmEventEnded(seasonalEventId)` → `confirmEventEnded.withData([seasonalEventId]).immediate()`
- `requestEventsUpdate()` → `requestEventsUpdate.immediate()`
- `onGetEvents(vos)`

## de.innogames.onyx.shared.exceptions.ExceptionService  (L550673-L550692)
- serviceName: **ExceptionService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: exception -> _onExceptionReceived; redirect -> _onRedirectReceived
- `get_serviceName()`
- `_onExceptionReceived(exception)`
- `_onRedirectReceived(redirect)`

## de.innogames.onyx.shared.guilds.services.GuildProgressionService  (L554494-L554519)
- serviceName: **GuildProgressionService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getOverview -> _onUpdatePerks
- `get_serviceName()`
- `getPerks()` → `getOverview.immediate()`
- `upgradePerk(perkType,xpLevel)` → `upgradePerk.withData([perkType,xpLevel]).immediate()`
- `resetAllPerks()` → `resetPerks.immediate()`
- `_onUpdatePerks(guildProgressionVO)`

## de.innogames.onyx.shared.guilds.services.GuildService  (L554520-L554633)
- serviceName: **GuildService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: guild_application_accepted -> _onGuildApplicationAccepted; guild_role_changed -> _onGuildRoleChanged; guild_expelled -> _onGuildMemberExpelled; guild_changed -> _onGuildMemberUpdated; refreshGuild -> onRefreshGuild
- `get_serviceName()`
- `refreshGuild()` → `refreshGuild.withCallback($bind(this,this.onRefreshGuild)).immediate()`
- `getGuild(guildId,callback)` → `getGuild.withData([guildId]).withCallback(callback).immediate()`
- `getMembershipRequests(callback)` → `getMembershipRequests.withCallback(callback).immediate()`
- `createGuild(guildName,guildDescription,allowInvitations,applicationData,guildBanner,callback)` → `createGuild.withData([guildName,guildDescription,guildBanner.get_shapeId(),guildBanner.get_shapeColor(),guildBanner.get_symbolId(),guildBanner.get_symbolColor(),allowInvitations,false,applicationData.get_id()]).withCallback(callback).immediate()`
- `editGuild(guildName,guildDescription,allowInvitations,applicationData,guildBanner,callback)` → `editGuild.withData([guildName,guildDescription,guildBanner.get_shapeId(),guildBanner.get_shapeColor(),guildBanner.get_symbolId(),guildBanner.get_symbolColor(),allowInvitations,false,applicationData.get_id()]).withCallback(callback).immediate()`
- `disbandGuild(callback)` → `disbandGuild.withCallback(callback).immediate()`
- `leaveGuild(callback)` → `leaveGuild.withCallback(callback).immediate()`
- `kickMember(playerId,callback)` → `kickMember.withData([playerId]).withCallback(callback).immediate()`
- `changeMemberRole(playerId,role,callback)` → `changeMemberRole.withData([playerId,role]).withCallback(callback).immediate()`
- `sendApplication(guildId,callback)` → `sendApplication.withData([guildId]).withCallback(callback).immediate()`
- `withdrawApplication(applicationId,callback)` → `withdrawApplication.withData([applicationId]).withCallback(callback).immediate()`
- `acceptApplication(applicationId,callback)` → `acceptApplication.withData([applicationId]).withCallback(callback).immediate()`
- `rejectApplication(applicationId,callback)` → `rejectApplication.withData([applicationId]).immediate()`
- `invitePlayer(playerId,callback)` → `invitePlayer.withData([playerId]).withCallback(callback).immediate()`
- `disinvitePlayer(invitationId,callback)` → `disinvitePlayer.withData([invitationId]).withCallback(callback).immediate()`
- `acceptInvitation(invitationId,callback)` → `acceptInvitation.withData([invitationId]).withCallback(callback).parseLastResponse().immediate()`
- `declineInvitation(invitationId,callback)` → `declineInvitation.withData([invitationId]).withCallback(callback).parseLastResponse().immediate()`
- `getGuildSuggestions(callback)` → `getGuildSuggestions.withData([40]).withCallback(callback).immediate()`
- `_onGuildMemberUpdated(guild)`
- `_onGuildRoleChanged(guild)`
- `_onGuildApplicationAccepted(guild)`
- `_onGuildMemberExpelled(data)`
- `onRefreshGuild(guild)`

## de.innogames.onyx.shared.indicators.services.IndicatorsService  (L563048-L563076)
- serviceName: **IndicatorsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getIndicators -> _onIndicatorsUpdated
- `get_serviceName()`
- `getIndicators()` → `getIndicators.immediate()`
- `clearIndicator(indicatorId,categoryId)` → `clearIndicator.withData([categoryId,indicatorId]).immediate()`
- `clearIndicators(indicatorIds)` → `clearIndicators.withData([indicatorIds]).immediate()`
- `_onIndicatorsUpdated(vos)`

## de.innogames.onyx.shared.messaging.service.MessageService  (L564839-L564875)
- serviceName: **MessageService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getMessages(mailboxType,offset,count,callback)` → `fetchMessages.withData([mailboxType.toString(),offset,count]).withCallback(callback)`
- `getMetadata(mailboxType,callback)` → `getMessageOverview.withData([mailboxType.toString()]).withCallback(callback)`
- `replyMessage(messageId,message,callback)` → `replyMessage.withData([messageId,message]).withCallback(callback).immediate()`
- `deleteMessage(messageId,callback)` → `deleteMessage.withData([messageId]).withCallback(callback).immediate()`
- `markMessageAsRead(messageId,callback)` → `markMessageAsRead.withData([messageId]).withCallback(callback).immediate()`
- `sendMessage(recipientName,subject,message,callback)` → `sendMessage.withData([recipientName,message,subject]).withCallback(callback).immediate()`
- `sendGuildMessage(subject,message,callback)` → `sendGuildMessage.withData([message,subject]).withCallback(callback).immediate()`
- `reportPlayer(reportMessage,reportedMessageId,messagePostId)` → `reportPlayer.withData([reportedMessageId,messagePostId,reportMessage]).immediate()`

## de.innogames.onyx.shared.quests.services.QuestDataService  (L570864-L570893)
- serviceName: **QuestService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getUpdates -> _onQuestUpdate; abortQuest -> _onQuestUpdate
- `get_serviceName()`
- `getUpdates()` → `getUpdates`
- `advanceQuest(questId,callback)` → `advanceQuest.withData([questId]).withCallback(callback)`
- `abortQuest(questId)` → `abortQuest.withData([questId])`
- `markSeen(questId)` → `markSeen.withData([questId])`
- `_onQuestUpdate(quests)`

## de.innogames.onyx.shared.ranking.service.RankingService  (L574168-L574207)
- serviceName: **RankingService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: accessRanking -> _onAccessRanking; getRankingList -> _onGetRankingList; newRank -> _onNewRank
- `get_serviceName()`
- `accessRanking(category,id)` → `accessRanking.withData([category.get_name(),8,id])`
- `getRankingList(category,pageIndex,filterString,filterType)` → `getRankingList.withData([category.get_name(),pageIndex,8,filterString,filterType])` [9 lines]
- `getRankingOverview(playerId,callback)` → `getRankingOverview.withData([playerId]).withCallback(callback).immediate()`
- `_onAccessRanking(rankings)`
- `_onGetRankingList(rankings)`
- `_onNewRank(ranking)`

## de.innogames.onyx.shared.rewards.services.EpisodicRewardsService  (L576954-L576973)
- serviceName: **EpisodicRewardsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getRewards -> _onGetRewards
- `get_serviceName()`
- `_onGetRewards(rewards)`

## de.innogames.onyx.shared.service.CallbackService  (L579406-L579421)
- serviceName: **CallbackService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: call -> _onCallback
- `get_serviceName()`
- `_onCallback(vo)`

## de.innogames.onyx.shared.spells.services.SpellService  (L580451-L580469)
- serviceName: **SpellService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `castSpellOnBuilding(spellId,cityMapEntityId,callback)` → `castSpellOnBuilding.withCallback(callback).withData([spellId,cityMapEntityId]).immediate()`
- `castGlobalSpell(spellId)` → `castSpell.withData([spellId]).immediate()`

## de.innogames.onyx.spire.service.SpireRankingService  (L619797-L619815)
- serviceName: **SpireRankingService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateRanking -> _onUpdateRanking
- `get_serviceName()`
- `getRanking(callback)` → `updateRanking.immediate().withCallback(callback)`
- `_onUpdateRanking(vo)`

## de.innogames.onyx.spire.service.SpireRoundsService  (L619816-L619830)
- serviceName: **SpireRoundsService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getOverview()` → `getOverview (complex)`

## de.innogames.onyx.spire.services.SpireService  (L619831-L619846)
- serviceName: **SpireService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: showRewards -> _onShowRewards
- `get_serviceName()`
- `_onShowRewards(rewards)`

## de.innogames.onyx.techtree.service.CityResearchService  (L632679-L632694)
- serviceName: **CityResearchService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateTechnologySection -> _onTechnologySectionUpdated
- `get_serviceName()`
- `_onTechnologySectionUpdated(technologySection)`

## de.innogames.onyx.techtree.service.TechnologyService  (L632695-L632725)
- serviceName: **ResearchService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getTechnologyData(callback)` → `startup.withCallback(callback).immediate()`
- `useKnowledgePoints(technologyId,amount)` → `invest.withData([technologyId,amount]).parseLastResponse()`
- `payTechnology(technologyId)` → `payTechnology.withData([technologyId]).immediate()`
- `buyInstantResearch(technologyId)` → `buyInstantResearch.withData([technologyId]).immediate()`
- `buyInstantResearchAndUnlock(technologyId,callback)` → `buyInstantResearchAndUnlock.withData([technologyId]).withCallback(callback).immediate()`
- `unlockGate(technologyId)` → `unlockGate.withData([technologyId]).immediate()`

## de.innogames.onyx.tournaments.services.TournamentService  (L638942-L638968)
- serviceName: **TournamentService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateTournamentPoints -> _onUpdateTournamentPoints; getTournamentReward -> _onGetTournamentReward
- `get_serviceName()`
- `getTournamentProgress()` → `getTournamentOverview.withCallback($bind(this,this._onGetTournamentOverview))`
- `_onGetTournamentOverview(vo)`
- `_onUpdateTournamentPoints(points)`
- `_onGetTournamentReward(rewards)`

## de.innogames.onyx.valuemanipulation.services.ValueManipulationService  (L642601-L642626)
- serviceName: **ValueManipulationService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getValueManipulations -> _onGetValueManipulations
- `get_serviceName()`
- `_onGetValueManipulations(vos)`
- `_createManipulations(vos)`

## de.innogames.onyx.videoads.services.VideoAdService  (L643681-L643714)
- serviceName: **VideoAdService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `getFeatures()` → `getFeatures (complex)`
- `getBuildersBonusConfig()` → `getBuildersBonusConfig (complex)`
- `start(featureId,context)` → `start.withData([featureId,context]).immediate()`
- `finish(featureId,context)` → `finish.withData([featureId,context]).immediate()`
- `track(featureId,context)` → `track.withData([featureId,context]).immediate()`
- `bypass(featureId,context)` → `bypass.withData([featureId,context]).immediate()`
- `addSafePushResponse(response,callback)`

## de.innogames.onyx.worldmap.service.ScoutingService  (L647559-L647596)
- serviceName: **WorldMapScoutService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: findProvincesToScout -> _onFindProvincesToScout; removeScout -> _onRemoveScout; updateScout -> _onUpdateScout
- `get_serviceName()`
- `startScouting(rowIndex,columnIndex,callback)` → `startScouting.withData([columnIndex,rowIndex]).immediate().withCallback(callback)`
- `finishScouting(rowIndex,columnIndex,callback)` → `finishScouting.withData([columnIndex,rowIndex]).withCallback(callback)`
- `instantFinish(rowIndex,columnIndex,cost,callback)` → `instantFinish.withData([columnIndex,rowIndex,cost]).immediate().withCallback(callback)`
- `_onFindProvincesToScout(provinces)`
- `_onRemoveScout(vos)`
- `_onUpdateScout(vo)`

## de.innogames.onyx.worldmap.service.UnlockEncounterService  (L647597-L647615)
- serviceName: **UnlockEncounterService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `unlockEncounter(rowIndex,columnIndex,encounterIndex,callback)` → `unlockEncounterByTrading.withData([columnIndex,rowIndex,encounterIndex]).withCallback(callback).immediate()`
- `premiumUnlockEncounter(rowIndex,columnIndex,encounterIndex,callback)` → `unlockEncounterByTradingUsingPremium.withData([columnIndex,rowIndex,encounterIndex]).withCallback(callback).immediate()`

## de.innogames.onyx.worldmap.service.WorldMapBattleService  (L647616-L647643)
- serviceName: **BattlefieldService**  super: de_innogames_shared_networking_AbstractConnectionService
- `get_serviceName()`
- `instantBattle(rowIndex,columnIndex,encounterIndex,playerUnits,callback)` → `instantBattle.withData([columnIndex,rowIndex,encounterIndex,de_innogames_onyx_worldmap_service_WorldMapBattleService._getUnitsVO(playerUnits)]).withCallback(callback).immediate()`
- `startBattle(rowIndex,columnIndex,encounterIndex,playerUnits,callback)` → `start.withData([columnIndex,rowIndex,encounterIndex,de_innogames_onyx_worldmap_service_WorldMapBattleService._getUnitsVO(playerUnits)]).withCallback(callback).immediate()`

## de.innogames.onyx.worldmap.service.WorldMapService  (L647644-L647731)
- serviceName: **WorldMapService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: updateProvince -> _onUpdateProvince; updateMapArea -> _onUpdateMapArea; updateTournamentTime -> _onUpdateTournamentTime
- `get_serviceName()`
- `dispose()`
- `startup(callback)` → `fetchInitialWorldMapData.immediate().withCallback(callback)`
- `getWorldMapAreas(areas,immediately,callback)` [22 lines]
- `getProvinceInformation(province,callback)` → `getProvinceInformation.withData([province.get_columnIndex(),province.get_rowIndex()]).withCallback(callback).immediate()`
- `getIncompleteProvinces(callback)` → `getIncompleteProvinces.withCallback(callback).immediate()`
- `getDiscoveredPlayerProvinces(callback)` → `getDiscoveredPlayerProvinces.withCallback(callback).immediate()`
- `_getWorldMapAreas()` → `fetchAreas.withCallback(this._getAreasCallback).withData([areaIds])` [11 lines]
- `_onUpdateProvince(vo)`
- `_onUpdateTournamentTime(vo)` [7 lines]
- `_onUpdateMapArea(areas)` [8 lines]

## de.innogames.strategycity.main.service.RelicService  (L665405-L665425)
- serviceName: **RelicService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: getRelicBoostGoodInformation -> _onRelicBoostGoodInfo; getRelicsInformation -> _onRelicsInfo
- `get_serviceName()`
- `_onRelicsInfo(relics)`
- `_onRelicBoostGoodInfo(boosts)`

## de.innogames.strategycity.main.service.SettingsService  (L665426-L665485)
- serviceName: **SettingsService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: requestActivationCode -> _onActivationCode; updateActivationEmail -> _onActivationCode
- `get_serviceName()`
- `updateSettings(settings,immediately,callback)` → `updateSettings.withData([settings]).immediate(immediately).parseLastResponse().withCallback(callback)`
- `fetchEmail()` → `fetchEmail.immediate()`
- `updateEmail(newEmail,password,callback)` → `updateEmail.withData([newEmail,password]).withCallback(callback)`
- `updatePassword(password,newPassword,callback)` → `updatePassword.withData([newPassword,password]).withCallback(callback).immediate()`
- `validateEmail(email,callback)` → `validateEmail.withData([email]).immediate().withCallback(callback)`
- `addEmail(email,hasAcceptedEmails,callback)` → `addEmail.withData([email,hasAcceptedEmails]).immediate().withCallback(callback)`
- `validatePassword(password,playerName,callback)` → `validatePassword.withData([password,password,playerName]).immediate().withCallback(callback)`
- `activateEmail(activationCode)` → `activateEmail.withData([activationCode]).immediate()`
- `requestActivationCode()` → `requestActivationCode`
- `requestActivationCodeWithNewEmail(email)` → `updateActivationEmail.withData([email])`
- `ignorePlayer(playerName)` → `ignorePlayer.withData([playerName]).immediate()`
- `unignorePlayer(playerName)` → `unignorePlayer.withData([playerName]).immediate()`
- `_onActivationCode(data)`

## de.innogames.strategycity.shared.service.ArmyService  (L666485-L666515)
- serviceName: **ArmyService**  super: de_innogames_shared_networking_AbstractConnectionService
- push listeners: addUnit -> _onAddUnit; healUnits -> _onHealUnit; revivedUnit -> _onRevivedUnit
- `get_serviceName()`
- `reviveUnits(battleId,wave,unitId)` → `reviveUnits.withData([battleId,wave,unitId]).immediate()`
- `buyUnits(unitType,provinceColumnIndex,provinceRowIndex,callback)` → `buyMissingUnitsForPremium.withData([unitType,provinceColumnIndex,provinceRowIndex]).withCallback(callback).immediate()`
- `_onAddUnit(vo)`
- `_onHealUnit(unitId)`
- `_onRevivedUnit(vo)`
