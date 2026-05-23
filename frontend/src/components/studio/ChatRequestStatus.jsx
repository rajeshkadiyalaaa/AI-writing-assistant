import React from 'react';
import { formatApiError } from '../../lib/errors';
import { useStudioChatState, useStudioChatActions } from '../../context/StudioChatContext';
import RequestStatusBar from './RequestStatusBar';

/** Merges chat in-flight state with assist/suggestions request for the top status bar. */
export default function ChatRequestStatus({ suggestionRequest }) {
  const { isGenerating, requestIsSlow, requestError, canRetryRequest } = useStudioChatState();
  const { cancelRequest, retryRequest } = useStudioChatActions();

  const activeRequest = isGenerating
    ? {
        isSlow: requestIsSlow,
        error: requestError ? formatApiError(requestError) : null,
        canRetry: canRetryRequest,
        onCancel: cancelRequest,
        onRetry: retryRequest,
        label: 'Chat',
      }
    : suggestionRequest;

  if (!activeRequest) return null;

  return (
    <RequestStatusBar
      visible
      isSlow={activeRequest.isSlow}
      message={`${activeRequest.label} request in progress…`}
      error={activeRequest.error}
      onCancel={activeRequest.onCancel}
      onRetry={activeRequest.onRetry}
      canRetry={activeRequest.canRetry}
    />
  );
}
