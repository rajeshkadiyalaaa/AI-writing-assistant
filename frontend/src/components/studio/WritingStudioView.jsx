import React from 'react';
import {
  PenTool, Save, Download, Settings, FileText,
  AlertTriangle, Key, MessageCircle, Sparkles, SlidersHorizontal, Check, AlertCircle, Info,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import SettingsSidebar from './SettingsSidebar';
import EditorPanel from './EditorPanel';
import AssistPanel from './AssistPanel';
import ApiKeyModal from './ApiKeyModal';
import CustomModelModal from './CustomModelModal';
import DraftRestoreBanner from './DraftRestoreBanner';
import ComparePreviewModal from './ComparePreviewModal';
import SuggestionPreviewModal from './SuggestionPreviewModal';
import RequestStatusBar from './RequestStatusBar';
import { headerLogoClassName } from '../../constants/branding';

export default function WritingStudioView({ p }) {
  const {
    isDraggingLeft,
    isDraggingRight,
    apiKeySet,
    setShowApiKeyModal,
    leftPanelWidth,
    rightPanelWidth,
    handleLeftResizerMouseDown,
    handleRightResizerMouseDown,
    mobilePanel,
    setMobilePanel,
    documentTitle,
    setDocumentTitle,
    documentTypes,
    documentType,
    createNewDocument,
    saveDocument,
    savedDocuments,
    loadDocument,
    deleteDocument,
    pendingDraft,
    draftTime,
    onRestoreDraft,
    onDismissDraft,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    editorVersions,
    onRestoreVersion,
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExport,
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuRef,
    showUsageStats,
    setShowUsageStats,
    tokenUsage,
    estimateCost,
    model,
    activeTab,
    setActiveTab,
    activeSidebarTab,
    setActiveSidebarTab,
    tone,
    setTone,
    toneOptions,
    setDocumentType,
    modelOptions,
    modelsSource,
    autoPickModel,
    setAutoPickModelPref,
    refreshModels,
    isRefreshingModels,
    setModel,
    setChatMessages,
    temperature,
    setTemperature,
    showModelInfo,
    setShowModelInfo,
    showTemperatureInfo,
    setShowTemperatureInfo,
    getModelDisplayName,
    isRecommendedModel,
    removeCustomModel,
    setShowCustomModelForm,
    history,
    content,
    setContent,
    chatMessages,
    messageInput,
    setMessageInput,
    chatIsGenerating,
    generateAIResponse,
    clearChat,
    conversationStarters,
    selectConversationStarter,
    chatEndRef,
    activeRequest,
    chatCancelRequest,
    suggestions,
    renderApiKeyPrompt,
    generateSuggestions,
    improveWriting,
    improveSelection,
    hasSelection,
    applySuggestion,
    setSuggestions,
    comparePreview,
    acceptCompare,
    rejectCompare,
    pendingApply,
    acceptPendingApply,
    rejectPendingApply,
    textareaRef,
    updateSelection,
    onInsertChatMessage,
    isImproving,
    showCustomModelForm,
    customModelId,
    setCustomModelId,
    customModelName,
    setCustomModelName,
    isVerifyingModel,
    addCustomModel,
    showApiKeyModal,
    maskedApiKey,
    apiKeyInput,
    setApiKeyInput,
    apiKeyError,
    setApiKeyError,
    showApiKey,
    setShowApiKey,
    isTestingApiKey,
    isUpdatingApiKey,
    apiKeyTestSuccess,
    rememberKey,
    setRememberKey,
    showSecurityInfo,
    setShowSecurityInfo,
    copied,
    testApiKey,
    updateApiKey,
    copyToClipboard,
    isProd,
    canSaveApiKeyViaUi,
    showNotification,
    showToast,
    toastMessage,
    toastType,
  } = p;

  const docMeta = documentTypes.find((t) => t.id === documentType);

  return (
    <div
      className={cn(
        'studio-shell',
        (isDraggingLeft || isDraggingRight) && 'no-select'
      )}
    >
      {activeRequest && (
        <RequestStatusBar
          visible
          isSlow={activeRequest.isSlow}
          message={`${activeRequest.label} request in progress…`}
          error={activeRequest.error}
          onCancel={activeRequest.onCancel}
          onRetry={activeRequest.onRetry}
          canRetry={activeRequest.canRetry}
        />
      )}

      {!apiKeySet && (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <AlertTriangle size={16} />
          <span>No API key configured.</span>
          <button type="button" onClick={() => setShowApiKeyModal(true)} className="font-semibold underline">
            Connect now
          </button>
        </div>
      )}

      <header className="relative z-50 flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white/80 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
        <button
          type="button"
          className="btn-icon lg:hidden"
          onClick={() => setMobilePanel(mobilePanel === 'settings' ? null : 'settings')}
          aria-label="Settings"
        >
          <SlidersHorizontal size={18} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <div className="hidden shrink-0 leading-none sm:block">
            <img
              src={`${process.env.PUBLIC_URL}/logo.svg`}
              alt="Scribe"
              className={headerLogoClassName}
            />
          </div>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="min-w-0 flex-1 truncate bg-transparent font-display text-base font-semibold text-zinc-900 focus:outline-none sm:text-lg"
          />
          {docMeta && (
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 sm:flex">
              {docMeta.icon}
              {docMeta.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={createNewDocument} className="btn-icon hidden sm:inline-flex" title="New">
            <FileText size={18} />
          </button>
          <button type="button" onClick={saveDocument} className="btn-icon hidden sm:inline-flex" title="Save">
            <Save size={18} />
          </button>

          <div className="relative">
            <button type="button" onClick={() => setShowExportMenu(!showExportMenu)} className="btn-icon" title="Export">
              <Download size={18} />
            </button>
            {showExportMenu && (
              <div ref={exportMenuRef} className="studio-panel absolute right-0 top-full z-[60] mt-1 min-w-[140px] py-1 animate-fade-in">
                {['markdown', 'pdf', 'docx'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => { handleExport(fmt); setShowExportMenu(false); }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="btn-icon" title="Settings">
              <Settings size={18} />
            </button>
            {showSettingsMenu && (
              <div ref={settingsMenuRef} className="studio-panel absolute right-0 top-full z-[60] mt-1 w-64 p-4 animate-fade-in">
                <p className="mb-3 text-sm font-medium">Preferences</p>
                <div className="mb-3">
                  <button type="button" onClick={() => setShowUsageStats(!showUsageStats)} className="text-xs text-accent hover:underline">
                    {showUsageStats ? 'Hide' : 'Show'} token usage
                  </button>
                  {showUsageStats && (
                    <div className="mt-2 rounded-lg bg-zinc-50 p-2 text-xs">
                      <div className="flex justify-between"><span>Total</span><span>{tokenUsage.total.total.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Last</span><span>{tokenUsage.last.total.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Est. cost</span><span>${estimateCost(tokenUsage.total.total, model).toFixed(4)}</span></div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowApiKeyModal(true);
                  }}
                  className="btn-secondary w-full text-sm"
                >
                  <Key size={14} /> API key
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-icon xl:hidden"
            onClick={() => setMobilePanel(mobilePanel === 'assist' ? null : 'assist')}
            aria-label="AI Assist"
          >
            <Sparkles size={18} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className="relative hidden shrink-0 lg:flex lg:flex-col"
          style={{ width: leftPanelWidth }}
        >
          <SettingsSidebar
                documentType={documentType}
                setDocumentType={setDocumentType}
                documentTypes={documentTypes}
                tone={tone}
                setTone={setTone}
                toneOptions={toneOptions}
                model={model}
                setModel={setModel}
                modelOptions={modelOptions}
                modelsSource={modelsSource}
                autoPickModel={autoPickModel}
                setAutoPickModelPref={setAutoPickModelPref}
                refreshModels={refreshModels}
                isRefreshingModels={isRefreshingModels}
                temperature={temperature}
                setTemperature={setTemperature}
                showModelInfo={showModelInfo}
                setShowModelInfo={setShowModelInfo}
                showTemperatureInfo={showTemperatureInfo}
                setShowTemperatureInfo={setShowTemperatureInfo}
                getModelDisplayName={getModelDisplayName}
                isRecommendedModel={isRecommendedModel}
                removeCustomModel={removeCustomModel}
                setShowCustomModelForm={setShowCustomModelForm}
                setChatMessages={setChatMessages}
                history={history}
                editorVersions={editorVersions}
                onRestoreVersion={onRestoreVersion}
                activeSidebarTab={activeSidebarTab}
                setActiveSidebarTab={setActiveSidebarTab}
                savedDocuments={savedDocuments}
                loadDocument={loadDocument}
                deleteDocument={deleteDocument}
                apiKeySet={apiKeySet}
                maskedApiKey={maskedApiKey}
                onOpenApiKeyModal={() => setShowApiKeyModal(true)}
              />
          <div ref={p.leftResizeRef} className="resize-handle right-0" onMouseDown={handleLeftResizerMouseDown} />
        </div>

        {mobilePanel === 'settings' && (
          <>
            <button type="button" className="overlay-backdrop" onClick={() => setMobilePanel(null)} aria-label="Close" />
            <SettingsSidebar
              isMobile
              onClose={() => setMobilePanel(null)}
              documentType={documentType}
              setDocumentType={setDocumentType}
              documentTypes={documentTypes}
              tone={tone}
              setTone={setTone}
              toneOptions={toneOptions}
              model={model}
              setModel={setModel}
              modelOptions={modelOptions}
              modelsSource={modelsSource}
              autoPickModel={autoPickModel}
              setAutoPickModelPref={setAutoPickModelPref}
              refreshModels={refreshModels}
              isRefreshingModels={isRefreshingModels}
              temperature={temperature}
              setTemperature={setTemperature}
              showModelInfo={showModelInfo}
              setShowModelInfo={setShowModelInfo}
              showTemperatureInfo={showTemperatureInfo}
              setShowTemperatureInfo={setShowTemperatureInfo}
              getModelDisplayName={getModelDisplayName}
              isRecommendedModel={isRecommendedModel}
              removeCustomModel={removeCustomModel}
              setShowCustomModelForm={setShowCustomModelForm}
              setChatMessages={setChatMessages}
              history={history}
              editorVersions={editorVersions}
              onRestoreVersion={onRestoreVersion}
              activeSidebarTab={activeSidebarTab}
              setActiveSidebarTab={setActiveSidebarTab}
              savedDocuments={savedDocuments}
              loadDocument={loadDocument}
              deleteDocument={deleteDocument}
              apiKeySet={apiKeySet}
              maskedApiKey={maskedApiKey}
              onOpenApiKeyModal={() => {
                setShowApiKeyModal(true);
                setMobilePanel(null);
              }}
            />
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {pendingDraft && (
            <DraftRestoreBanner
              draftTime={draftTime}
              onRestore={onRestoreDraft}
              onDismiss={onDismissDraft}
            />
          )}
          <EditorPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            content={content}
            setContent={setContent}
            chatMessages={chatMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            chatIsGenerating={chatIsGenerating}
            generateAIResponse={generateAIResponse}
            onCancelChat={chatCancelRequest}
            clearChat={clearChat}
            conversationStarters={conversationStarters}
            selectConversationStarter={selectConversationStarter}
            documentTypes={documentTypes}
            documentType={documentType}
            tone={tone}
            getModelDisplayName={getModelDisplayName}
            model={model}
            chatEndRef={chatEndRef}
            saveDocument={saveDocument}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            textareaRef={textareaRef}
            onSelectionChange={updateSelection}
            hasSelection={hasSelection}
            onImproveSelection={improveSelection}
            onInsertChatMessage={onInsertChatMessage}
            isImproving={isImproving}
          />
        </main>

        {activeTab === 'editor' && (
          <div
            className="relative hidden shrink-0 xl:flex xl:flex-col"
            style={{ width: rightPanelWidth }}
          >
            <AssistPanel
              suggestions={suggestions}
              isGenerating={isImproving}
              content={content}
              apiKeySet={apiKeySet}
              renderApiKeyPrompt={renderApiKeyPrompt}
              generateSuggestions={generateSuggestions}
              improveWriting={improveWriting}
              improveSelection={improveSelection}
              hasSelection={hasSelection}
              applySuggestion={applySuggestion}
              setSuggestions={setSuggestions}
            />
            <div ref={p.rightResizeRef} className="resize-handle left-0" onMouseDown={handleRightResizerMouseDown} />
          </div>
        )}

        {mobilePanel === 'assist' && activeTab === 'editor' && (
          <>
            <button type="button" className="overlay-backdrop" onClick={() => setMobilePanel(null)} aria-label="Close" />
            <div className="fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,360px)]">
              <AssistPanel
                isMobile
                onClose={() => setMobilePanel(null)}
                suggestions={suggestions}
                isGenerating={isImproving}
                content={content}
                apiKeySet={apiKeySet}
                renderApiKeyPrompt={renderApiKeyPrompt}
                generateSuggestions={generateSuggestions}
                improveWriting={improveWriting}
                improveSelection={improveSelection}
                hasSelection={hasSelection}
                applySuggestion={applySuggestion}
                setSuggestions={setSuggestions}
              />
            </div>
          </>
        )}
      </div>

      <nav className="flex shrink-0 border-t border-zinc-200/80 bg-white/90 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => { setActiveTab('editor'); setMobilePanel(null); }}
          className={cn('mobile-nav-item', activeTab === 'editor' && 'mobile-nav-item-active')}
        >
          <PenTool size={20} />
          Write
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('chat'); setMobilePanel(null); }}
          className={cn('mobile-nav-item', activeTab === 'chat' && 'mobile-nav-item-active')}
        >
          <MessageCircle size={20} />
          Chat
        </button>
        {activeTab === 'editor' && (
          <button
            type="button"
            onClick={() => setMobilePanel(mobilePanel === 'assist' ? null : 'assist')}
            className={cn('mobile-nav-item', mobilePanel === 'assist' && 'mobile-nav-item-active')}
          >
            <Sparkles size={20} />
            Assist
          </button>
        )}
        <button
          type="button"
          onClick={() => setMobilePanel(mobilePanel === 'settings' ? null : 'settings')}
          className={cn('mobile-nav-item', mobilePanel === 'settings' && 'mobile-nav-item-active')}
        >
          <SlidersHorizontal size={20} />
          Style
        </button>
      </nav>

      <ApiKeyModal
        open={showApiKeyModal}
        apiKeySet={apiKeySet}
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        apiKeyError={apiKeyError}
        setApiKeyError={setApiKeyError}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        isTestingApiKey={isTestingApiKey}
        isUpdatingApiKey={isUpdatingApiKey}
        apiKeyTestSuccess={apiKeyTestSuccess}
        rememberKey={rememberKey}
        setRememberKey={setRememberKey}
        showSecurityInfo={showSecurityInfo}
        setShowSecurityInfo={setShowSecurityInfo}
        onClose={() => { setShowApiKeyModal(false); setApiKeyInput(''); setApiKeyError(''); }}
        onTest={testApiKey}
        onSave={updateApiKey}
        isProd={isProd}
        canSaveApiKeyViaUi={canSaveApiKeyViaUi}
      />

      <CustomModelModal
        open={showCustomModelForm}
        customModelId={customModelId}
        setCustomModelId={setCustomModelId}
        customModelName={customModelName}
        setCustomModelName={setCustomModelName}
        isVerifyingModel={isVerifyingModel}
        onClose={() => setShowCustomModelForm(false)}
        onAdd={addCustomModel}
      />

      {comparePreview && (
        <ComparePreviewModal
          title={comparePreview.title}
          subtitle={comparePreview.subtitle}
          selectionLabel={comparePreview.selectionLabel}
          before={comparePreview.before}
          after={comparePreview.after}
          onAccept={acceptCompare}
          onReject={rejectCompare}
        />
      )}

      {pendingApply && (
        <SuggestionPreviewModal
          suggestion={pendingApply.suggestion}
          previewContent={pendingApply.previewContent}
          warning={pendingApply.warning}
          canForceApply={pendingApply.canForceApply}
          isNotFound={pendingApply.isNotFound}
          onAccept={acceptPendingApply}
          onReject={rejectPendingApply}
        />
      )}

      {showToast && (
        <div
          className={cn(
            'fixed bottom-20 right-4 z-[70] flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 shadow-panel animate-slide-up sm:bottom-6',
            toastType === 'success' && 'bg-emerald-50 text-emerald-800',
            toastType === 'error' && 'bg-red-50 text-red-800',
            toastType === 'info' && 'bg-blue-50 text-blue-800'
          )}
        >
          {toastType === 'success' && <Check size={18} />}
          {toastType === 'error' && <AlertCircle size={18} />}
          {toastType === 'info' && <Info size={18} />}
          <p className="text-sm">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
