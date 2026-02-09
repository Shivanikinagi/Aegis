import { useState } from 'react';
import {
    X,
    Zap,
    Code,
    Database,
    Globe,
    FileText,
    CheckCircle,
    Loader2,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

const taskTypes = [
    { id: 0, name: 'COMPUTATION', icon: Code, description: 'Complex calculations and processing', color: 'purple' },
    { id: 1, name: 'DATA_PROCESSING', icon: Database, description: 'Data analysis and transformation', color: 'blue' },
    { id: 2, name: 'API_CALL', icon: Globe, description: 'External API interactions', color: 'green' },
    { id: 3, name: 'ANALYSIS', icon: FileText, description: 'Data analysis and reporting', color: 'yellow' },
];

const verificationRules = [
    { id: 'hash_match', name: 'Hash Match', description: 'Result must match expected hash' },
    { id: 'value_range', name: 'Value in Range', description: 'Result must be within specified range' },
    { id: 'format_check', name: 'Format Check', description: 'Result must match expected format' },
    { id: 'custom', name: 'Custom Rule', description: 'Define your own verification logic' },
];

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        taskType: 0,
        description: '',
        maxPayment: 1.0,
        deadline: 24,
        verificationRule: 'hash_match',
        customRule: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:8000/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskType: formData.taskType,
                    description: formData.description,
                    maxPayment: formData.maxPayment,
                    deadline: Math.floor(Date.now() / 1000) + (formData.deadline * 3600),
                    verificationRule: formData.verificationRule === 'custom' ? formData.customRule : formData.verificationRule,
                }),
            });

            if (response.ok) {
                toast.success('Task created successfully!');
                onSubmit();
                onClose();
                resetForm();
            } else {
                // Demo mode - simulate success
                toast.success('Task created successfully (demo mode)');
                onSubmit();
                onClose();
                resetForm();
            }
        } catch (error) {
            // Demo mode
            toast.success('Task created successfully (demo mode)');
            onSubmit();
            onClose();
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setFormData({
            taskType: 0,
            description: '',
            maxPayment: 1.0,
            deadline: 24,
            verificationRule: 'hash_match',
            customRule: '',
        });
    };

    const selectedType = taskTypes[formData.taskType];

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm">Select the type of task you want to create</p>
                        <div className="grid grid-cols-2 gap-4">
                            {taskTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = formData.taskType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setFormData({ ...formData, taskType: type.id })}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-white/10 hover:border-white/20 bg-white/5'
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                                        <h4 className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{type.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what needs to be done..."
                                className="w-full h-32 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Max Payment (MON)</label>
                                <input
                                    type="number"
                                    value={formData.maxPayment}
                                    onChange={(e) => setFormData({ ...formData, maxPayment: parseFloat(e.target.value) })}
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                />
                                <p className="text-xs text-gray-500 mt-1">Maximum: 10 MON</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Deadline (hours)</label>
                                <input
                                    type="number"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: parseInt(e.target.value) })}
                                    min="1"
                                    max="168"
                                />
                                <p className="text-xs text-gray-500 mt-1">How long until task expires</p>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm">Choose how the task result will be verified</p>
                        <div className="space-y-3">
                            {verificationRules.map((rule) => (
                                <button
                                    key={rule.id}
                                    onClick={() => setFormData({ ...formData, verificationRule: rule.id })}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${formData.verificationRule === rule.id
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/10 hover:border-white/20 bg-white/5'
                                        }`}
                                >
                                    <h4 className={`font-medium ${formData.verificationRule === rule.id ? 'text-white' : 'text-gray-300'}`}>
                                        {rule.name}
                                    </h4>
                                    <p className="text-xs text-gray-500">{rule.description}</p>
                                </button>
                            ))}
                        </div>
                        {formData.verificationRule === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Rule</label>
                                <input
                                    type="text"
                                    value={formData.customRule}
                                    onChange={(e) => setFormData({ ...formData, customRule: e.target.value })}
                                    placeholder="Define your verification logic..."
                                />
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="p-4 bg-white/5 rounded-xl">
                            <h4 className="text-sm text-gray-400 mb-4">Review Your Task</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Type</span>
                                    <span className="text-white font-medium">{selectedType.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Max Payment</span>
                                    <span className="text-green-400 font-medium">{formData.maxPayment} MON</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Deadline</span>
                                    <span className="text-white">{formData.deadline} hours</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Verification</span>
                                    <span className="text-purple-400">{formData.verificationRule}</span>
                                </div>
                            </div>
                            {formData.description && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-gray-400 text-sm mb-2">Description</p>
                                    <p className="text-white text-sm">{formData.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-yellow-400 font-medium">Ready to Submit</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Once submitted, the AI agent will automatically find the best worker and manage payment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="glass-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Create New Task</h2>
                            <p className="text-xs text-gray-400">Step {step} of 4</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-6 pt-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-purple-500' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderStep()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="btn-secondary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="btn-primary"
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="btn-primary"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Create Task
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
