'use client';

import { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: TaskFormData) => void;
}

export interface TaskFormData {
    taskType: number;
    description: string;
    maxPayment: number;
    deadline: number; // hours from now
    verificationRule: string;
}

const taskTypes = [
    { id: 0, name: 'Data Analysis', icon: '📊', description: 'Analyze and process data' },
    { id: 1, name: 'Text Generation', icon: '📝', description: 'Generate written content' },
    { id: 2, name: 'Code Review', icon: '💻', description: 'Review and audit code' },
    { id: 3, name: 'Research', icon: '🔬', description: 'Research and summarize topics' },
    { id: 4, name: 'Computation', icon: '🧮', description: 'Perform calculations' },
    { id: 5, name: 'Other', icon: '📦', description: 'General purpose tasks' },
];

const verificationTemplates = [
    { name: 'Length Check', rule: 'length > 200', description: 'Result must be > 200 chars' },
    { name: 'Contains Keyword', rule: 'contains("result")', description: 'Must contain specific text' },
    { name: 'Numeric Result', rule: 'result > 0', description: 'Must return positive number' },
    { name: 'Approval Required', rule: 'approved', description: 'Manual verification needed' },
];

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
    const [formData, setFormData] = useState<TaskFormData>({
        taskType: 0,
        description: '',
        maxPayment: 1,
        deadline: 24,
        verificationRule: 'length > 200',
    });
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        onSubmit(formData);
        setSubmitted(true);
        setTimeout(() => {
            onClose();
            setSubmitted(false);
            setStep(1);
            setFormData({
                taskType: 0,
                description: '',
                maxPayment: 1,
                deadline: 24,
                verificationRule: 'length > 200',
            });
        }, 2000);
        setIsSubmitting(false);
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Select Task Type</label>
                <div className="grid grid-cols-2 gap-3">
                    {taskTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setFormData({ ...formData, taskType: type.id })}
                            className={`p-4 rounded-xl border transition-all text-left ${formData.taskType === type.id
                                    ? 'bg-purple-500/20 border-purple-500'
                                    : 'bg-[#1e1e2e] border-[#27272a] hover:border-purple-500/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{type.icon}</span>
                                <div>
                                    <p className="text-white font-medium">{type.name}</p>
                                    <p className="text-xs text-gray-500">{type.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Task Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what the task should accomplish..."
                    className="w-full h-32 px-4 py-3 bg-[#1e1e2e] border border-[#27272a] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Max Payment (MON)</label>
                    <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.maxPayment}
                        onChange={(e) => setFormData({ ...formData, maxPayment: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Deadline (hours)</label>
                    <input
                        type="number"
                        min="1"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Verification Rule</label>
                <div className="space-y-3">
                    {verificationTemplates.map((template) => (
                        <button
                            key={template.rule}
                            onClick={() => setFormData({ ...formData, verificationRule: template.rule })}
                            className={`w-full p-4 rounded-xl border transition-all text-left ${formData.verificationRule === template.rule
                                    ? 'bg-purple-500/20 border-purple-500'
                                    : 'bg-[#1e1e2e] border-[#27272a] hover:border-purple-500/50'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-medium">{template.name}</p>
                                    <p className="text-xs text-gray-500">{template.description}</p>
                                </div>
                                <code className="text-sm text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">
                                    {template.rule}
                                </code>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Custom Rule</label>
                <input
                    type="text"
                    value={formData.verificationRule}
                    onChange={(e) => setFormData({ ...formData, verificationRule: e.target.value })}
                    placeholder="Enter custom verification rule..."
                    className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                />
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="space-y-4">
            <div className="p-4 bg-[#1e1e2e] rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Task Type</p>
                <p className="text-white font-medium flex items-center gap-2">
                    <span>{taskTypes[formData.taskType].icon}</span>
                    {taskTypes[formData.taskType].name}
                </p>
            </div>

            <div className="p-4 bg-[#1e1e2e] rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-white">{formData.description || 'No description provided'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#1e1e2e] rounded-xl">
                    <p className="text-sm text-gray-400 mb-1">Max Payment</p>
                    <p className="text-white font-medium">{formData.maxPayment} MON</p>
                </div>
                <div className="p-4 bg-[#1e1e2e] rounded-xl">
                    <p className="text-sm text-gray-400 mb-1">Deadline</p>
                    <p className="text-white font-medium">{formData.deadline} hours</p>
                </div>
            </div>

            <div className="p-4 bg-[#1e1e2e] rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Verification Rule</p>
                <code className="text-purple-400">{formData.verificationRule}</code>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                        <p className="text-sm text-yellow-400 font-medium">Confirmation Required</p>
                        <p className="text-xs text-gray-400 mt-1">
                            This will create an on-chain task. The agent will automatically find a worker and propose payment.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Task Created!</h3>
            <p className="text-gray-400">
                The agent will now find a suitable worker and propose an assignment.
            </p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 glass-card p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Create Task</h2>
                        {!submitted && (
                            <p className="text-sm text-gray-400">Step {step} of 4</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#27272a] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Progress bar */}
                {!submitted && (
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-purple-500' : 'bg-[#27272a]'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Content */}
                {submitted ? renderSuccess() : (
                    <>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderReview()}
                    </>
                )}

                {/* Footer */}
                {!submitted && (
                    <div className="flex justify-between mt-6 pt-6 border-t border-[#27272a]">
                        <button
                            onClick={() => setStep(Math.max(1, step - 1))}
                            className={`btn-secondary ${step === 1 ? 'invisible' : ''}`}
                        >
                            Back
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="btn-primary"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`btn-primary flex items-center gap-2 ${isSubmitting ? 'opacity-50' : ''}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Task
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
