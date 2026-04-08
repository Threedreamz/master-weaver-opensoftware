export default function FlowEditorLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading flow editor...</p>
      </div>
    </div>
  );
}
