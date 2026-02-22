import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../config/api';
import { formatDate, formatTime } from '../../utils/formatDate';
import toast from 'react-hot-toast';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import QRCodeModal from '../../components/QRCodeModal';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ViewResponses = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'individual', or 'lower-feedback'
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedLowerFeedbackStudent, setSelectedLowerFeedbackStudent] = useState('');
  const [reFeedbackQR, setReFeedbackQR] = useState({ isOpen: false, link: '', title: '' });
  const abortRef = useRef(null);

  const fetchResponses = useCallback(async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      const res = await api.get(`/responses/${formId}/responses`, { signal: abortRef.current.signal });
      setResponses(res.data.data);
    } catch (error) {
      if (error.name !== 'CanceledError') console.error("Error fetching responses", error);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchResponses();
    return () => abortRef.current?.abort();
  }, [fetchResponses]);

  const exportToExcel = async () => {
    if (responses.length === 0) {
      toast.error('No data to export. No responses to download.');
      return;
    }

    try {
      // Prepare headers
      const headers = ['Student Name', 'Batch', 'Submission Date', 'Submission Time'];
      
      if (responses[0].form && responses[0].form.questions) {
        responses[0].form.questions.forEach(q => {
          headers.push(q.questionText);
        });
      }

      // Prepare data rows
      const dataRows = responses.map(response => {
        const row = [
          response.studentName,
          response.batch || 'N/A',
          formatDate(response.submittedAt),
          formatTime(response.submittedAt)
        ];

        response.answers.forEach(answerObj => {
          const answer = Array.isArray(answerObj.answer)
            ? answerObj.answer.join('; ')
            : answerObj.answer;
          row.push(answer);
        });

        return row;
      });

      // Combine headers and data
      const sheetData = [headers, ...dataRows];

      // Create workbook
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Form Responses');

      // Set column widths
      const columnWidths = headers.map(() => 20);
      worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));

      // Generate file and download
      const fileName = `form_responses_${formId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Process data for visualizations (memoized)
  const chartData = useMemo(() => {
    if (responses.length === 0 || !responses[0].form) return {};

    const questions = responses[0].form.questions;
    const result = {};

    questions.forEach(question => {
      const questionId = question._id.toString();
      
      if (question.type === 'mcq' || question.type === 'yes_no') {
        const optionCounts = {};
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer) {
            const answerValue = answer.answer;
            optionCounts[answerValue] = (optionCounts[answerValue] || 0) + 1;
          }
        });
        
        result[questionId] = {
          type: 'pie',
          questionText: question.questionText,
          data: Object.entries(optionCounts).map(([name, value]) => ({ name, value }))
        };
      } else if (question.type === 'star_rating') {
        const starCounts = {};
        const maxStars = question.maxStars || 10;
        
        for (let i = 1; i <= maxStars; i++) {
          starCounts[i] = 0;
        }
        
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer) {
            const ansVal = answer.answer;
            const rating = typeof ansVal === 'object' && ansVal !== null ? parseInt(ansVal.rating) : parseInt(ansVal);
            if (rating >= 1 && rating <= maxStars) {
              starCounts[rating] = (starCounts[rating] || 0) + 1;
            }
          }
        });
        
        result[questionId] = {
          type: 'bar',
          questionText: question.questionText,
          data: Object.entries(starCounts).map(([stars, count]) => ({ 
            stars: `${stars} Star${stars > 1 ? 's' : ''}`, 
            count 
          }))
        };
      } else if (question.type === 'short' || question.type === 'paragraph') {
        const distinctAnswers = new Set();
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer && answer.answer.trim()) {
            distinctAnswers.add(answer.answer.trim());
          }
        });
        
        result[questionId] = {
          type: 'text',
          questionText: question.questionText,
          questionType: question.type,
          data: Array.from(distinctAnswers)
        };
      }
    });

    return result;
  }, [responses]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const renderSummaryView = () => {
    if (Object.keys(chartData).length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">No data to display.</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {Object.entries(chartData).map(([questionId, data], index) => (
          <div key={questionId} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {data.questionText}
            </h3>
            
            {data.type === 'pie' && data.data.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="w-full md:w-1/2" style={{ maxWidth: 400, height: 300 }}>
                  <Pie
                    data={{
                      labels: data.data.map(item => item.name),
                      datasets: [
                        {
                          data: data.data.map(item => item.value),
                          backgroundColor: COLORS,
                          borderColor: COLORS.map(color => color),
                          borderWidth: 1,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(0);
                              return `${label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {data.data.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">
                        {entry.name}: <span className="font-semibold">{entry.value}</span> responses
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.type === 'bar' && (
              <div className="w-full" style={{ height: 300 }}>
                <Bar
                  data={{
                    labels: data.data.map(item => item.stars),
                    datasets: [
                      {
                        label: 'Number of Responses',
                        data: data.data.map(item => item.count),
                        backgroundColor: '#3B82F6',
                        borderColor: '#2563EB',
                        borderWidth: 1,
                        barThickness: 20,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              </div>
            )}

            {data.type === 'text' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">{data.data.length}</span> distinct answer(s)
                </p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {data.data.map((answer, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded border border-gray-200 ${
                        data.questionType === 'paragraph' ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderIndividualView = () => {
    const selectedResponse = responses.find(r => r._id === selectedStudent);

    return (
      <div className="space-y-6">
        {/* Student Selector */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Student
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
          >
            <option value="">Choose a student...</option>
            {responses.map((response, idx) => (
              <option key={response._id} value={response._id}>
                {response.studentName} {response.batch ? `(${response.batch})` : ''} - {formatDate(response.submittedAt)}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Student Response */}
        {selectedResponse && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            {/* Response Header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {selectedResponse.studentName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Batch:</span> {selectedResponse.batch || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {formatDate(selectedResponse.submittedAt)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(selectedResponse.submittedAt)}
                </p>
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-4">
              {selectedResponse.answers.map((answerObj, idx) => {
                const question = selectedResponse.form?.questions?.find(
                  q => q._id.toString() === answerObj.questionId.toString()
                );
                
                const renderAnswer = () => {
                  if (question?.type === 'star_rating') {
                    const ansVal = answerObj.answer;
                    const rating = typeof ansVal === 'object' && ansVal !== null ? parseInt(ansVal.rating) || 0 : parseInt(ansVal) || 0;
                    const reason = typeof ansVal === 'object' && ansVal !== null ? ansVal.reason : null;
                    const maxStars = question.maxStars || 10;
                    return (
                      <div>
                        <div className="flex items-center gap-1">
                          {[...Array(maxStars)].map((_, starIdx) => (
                            <svg
                              key={starIdx}
                              className={`w-6 h-6 ${
                                starIdx < rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="1"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          ))}
                          <span className="ml-2 text-sm text-gray-600">
                            ({rating} / {maxStars})
                          </span>
                        </div>
                        {reason && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800"><strong>Reason:</strong> {reason}</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {Array.isArray(answerObj.answer)
                        ? answerObj.answer.join(', ')
                        : answerObj.answer}
                    </p>
                  );
                };
                
                return (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Question {idx + 1}: {question ? question.questionText : `Question ${idx + 1}`}
                    </p>
                    <div className="mt-2">
                      {renderAnswer()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!selectedStudent && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">Please select a student to view their response.</p>
          </div>
        )}
      </div>
    );
  };

  // Extract lower feedbacks (memoized): Students who answered "No" to Yes/No or rated < 8 stars
  const lowerFeedbackData = useMemo(() => {
    if (responses.length === 0 || !responses[0].form) {
      return [];
    }

    const questions = responses[0].form.questions;
    const lowerFeedbackList = [];

    responses.forEach(response => {
      response.answers.forEach(answerObj => {
        const question = questions.find(q => q._id.toString() === answerObj.questionId.toString());
        
        if (!question) return;

        let isLowerFeedback = false;

        if (question.type === 'yes_no' && answerObj.answer === 'No') {
          isLowerFeedback = true;
        }

        if (question.type === 'star_rating') {
          const ansVal = answerObj.answer;
          const rating = typeof ansVal === 'object' && ansVal !== null ? parseInt(ansVal.rating) : parseInt(ansVal);
          if (rating < 8) {
            isLowerFeedback = true;
          }
        }

        if (isLowerFeedback) {
          const ansVal = answerObj.answer;
          const displayAnswer = question.type === 'star_rating'
            ? (typeof ansVal === 'object' && ansVal !== null ? ansVal.rating : ansVal)
            : ansVal;
          const reason = question.type === 'star_rating' && typeof ansVal === 'object' && ansVal !== null ? ansVal.reason : null;
          lowerFeedbackList.push({
            studentName: response.studentName,
            batch: response.batch,
            submittedAt: response.submittedAt,
            questionText: question.questionText,
            questionType: question.type,
            answer: displayAnswer,
            reason: reason,
            questionId: question._id,
            responseId: response._id
          });
        }
      });
    });

    return lowerFeedbackList;
  }, [responses]);

  const renderLowerFeedbackView = () => {
    const lowerFeedbacks = lowerFeedbackData;

    if (lowerFeedbacks.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-gray-600 text-lg font-medium">Great! No lower feedbacks found.</p>
          <p className="text-gray-500 mt-2">All students have provided positive ratings and responses.</p>
        </div>
      );
    }

    // Get unique students with lower feedbacks
    const studentsWithLowerFeedback = [...new Set(lowerFeedbacks.map(f => f.studentName))];
    
    // Set first student as selected if not already selected
    if (!selectedLowerFeedbackStudent && studentsWithLowerFeedback.length > 0) {
      setSelectedLowerFeedbackStudent(studentsWithLowerFeedback[0]);
    }

    // Get feedbacks for selected student
    const selectedStudentFeedback = selectedLowerFeedbackStudent 
      ? lowerFeedbacks.filter(f => f.studentName === selectedLowerFeedbackStudent)
      : [];

    // Get selected student's full response data
    const selectedStudentResponse = selectedLowerFeedbackStudent
      ? responses.find(r => r.studentName === selectedLowerFeedbackStudent)
      : null;

    return (
      <div className="space-y-4">
        {/* Alert Summary */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-900 font-semibold">
            ⚠️ {lowerFeedbacks.length} lower feedback(s) from {studentsWithLowerFeedback.length} student(s)
          </p>
          <p className="text-red-800 text-sm mt-1">
            Students who answered "No" to Yes/No questions or rated less than 8 stars
          </p>
        </div>

        {/* Student Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <div className="flex border-b border-gray-200 min-w-full">
              {studentsWithLowerFeedback.map((studentName) => {
                const studentFeedbackCount = lowerFeedbacks.filter(f => f.studentName === studentName).length;
                return (
                  <button
                    key={studentName}
                    onClick={() => setSelectedLowerFeedbackStudent(studentName)}
                    className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedLowerFeedbackStudent === studentName
                        ? 'text-red-700 border-b-2 border-red-700 bg-red-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    👤 {studentName}
                    <span className="ml-2 inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      {studentFeedbackCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student's Lower Feedbacks Content */}
          {selectedStudentResponse && selectedStudentFeedback.length > 0 && (
            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Student Name</p>
                    <p className="text-lg font-bold text-gray-900">{selectedStudentResponse.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Batch</p>
                    <p className="text-lg font-bold text-gray-900">{selectedStudentResponse.batch}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Submission Date</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(selectedStudentResponse.submittedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Submission Time</p>
                    <p className="text-lg font-semibold text-gray-900">{formatTime(selectedStudentResponse.submittedAt)}</p>
                  </div>
                </div>
                {/* Generate Re-Feedback QR Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/form/${formId}/re-feedback/${selectedStudentResponse._id}`;
                      setReFeedbackQR({ isOpen: true, link, title: `Re-Feedback: ${selectedStudentResponse.studentName}` });
                    }}
                    className="px-4 py-2 bg-orange-600 text-white font-medium rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 flex items-center gap-2"
                  >
                    🔄 Generate Re-Feedback QR Code
                  </button>
                </div>
              </div>

              {/* Show Re-Feedback Responses if any */}
              {(() => {
                const reFeedbacks = responses.filter(r => r.isReFeedback && r.originalResponseId === selectedStudentResponse._id);
                if (reFeedbacks.length === 0) return null;
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">🔄 Re-Feedback Responses</h3>
                    {reFeedbacks.map((reFeedback, rIdx) => (
                      <div key={rIdx} className="mb-4 p-4 bg-white border border-green-100 rounded">
                        <p className="text-sm text-gray-600 mb-3">
                          Re-submitted on: {formatDate(reFeedback.submittedAt)} at {formatTime(reFeedback.submittedAt)}
                        </p>
                        {reFeedback.answers.map((newAns, aIdx) => {
                          const question = responses[0]?.form?.questions?.find(q => q._id.toString() === newAns.questionId.toString());
                          const prevAns = reFeedback.previousAnswers?.find(p => p.questionId.toString() === newAns.questionId.toString());
                          if (!question) return null;
                          
                          const formatAnswer = (ans) => {
                            if (ans === null || ans === undefined) return 'N/A';
                            if (typeof ans === 'object' && ans !== null && ans.rating !== undefined) return `${ans.rating} / ${question.maxStars || 10}${ans.reason ? ` (Reason: ${ans.reason})` : ''}`;
                            if (Array.isArray(ans)) return ans.join(', ');
                            return String(ans);
                          };

                          const oldFormatted = prevAns ? formatAnswer(prevAns.answer) : 'N/A';
                          const newFormatted = formatAnswer(newAns.answer);
                          const changed = oldFormatted !== newFormatted;

                          return (
                            <div key={aIdx} className={`p-3 mb-2 rounded border ${changed ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                              <p className="text-sm font-medium text-gray-700 mb-1">{question.questionText}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase">Old Answer</p>
                                  <p className="text-gray-800">{oldFormatted}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase">New Answer</p>
                                  <p className={`${changed ? 'text-orange-700 font-semibold' : 'text-gray-800'}`}>{newFormatted}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Lower Feedback Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Lower Feedback Details</h3>
                {selectedStudentFeedback.map((feedback, idx) => (
                  <div key={idx} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Question {idx + 1}</p>
                        <p className="text-base font-semibold text-gray-900 mt-1">{feedback.questionText}</p>
                      </div>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold ml-4 whitespace-nowrap">
                        {feedback.questionType === 'yes_no' ? 'Yes/No' : 'Star Rating'}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-white rounded border border-yellow-100">
                      {feedback.questionType === 'yes_no' && (
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📍</span>
                          <span className="inline-block px-4 py-2 bg-red-100 text-red-800 rounded font-bold text-base">
                            {feedback.answer}
                          </span>
                        </div>
                      )}
                      {feedback.questionType === 'star_rating' && (
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">⭐</span>
                            <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded font-bold text-base">
                              {feedback.answer} out of 10
                            </span>
                          </div>
                          {feedback.reason && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm text-yellow-800"><strong>Reason:</strong> {feedback.reason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments/Notes Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Student's Comments</h3>
                <div className="space-y-3">
                  {selectedStudentResponse.answers
                    .filter(ans => {
                      const question = responses[0]?.form?.questions?.find(q => q._id.toString() === ans.questionId.toString());
                      return question && (question.type === 'paragraph' || question.type === 'long');
                    })
                    .length > 0 ? (
                    selectedStudentResponse.answers
                      .filter(ans => {
                        const question = responses[0]?.form?.questions?.find(q => q._id.toString() === ans.questionId.toString());
                        return question && (question.type === 'paragraph' || question.type === 'long');
                      })
                      .map((ans, idx) => {
                        const question = responses[0]?.form?.questions?.find(q => q._id.toString() === ans.questionId.toString());
                        return (
                          <div key={idx} className="p-3 bg-white border border-blue-100 rounded">
                            <p className="text-sm font-semibold text-gray-700 mb-2">{question.questionText}</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{ans.answer}</p>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-gray-600 italic">No comments provided by this student.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600">Loading responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            to="/admin/dashboard"
            className="text-blue-700 hover:text-blue-900 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Form Responses</h1>
        </div>

        {/* Responses Count and Export */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-lg font-medium text-gray-900">
            Total Responses: {responses.length}
          </p>
          <div className="flex gap-3">
            <button
              onClick={fetchResponses}
              className="px-6 py-2 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
            >
              🔄 Refresh
            </button>
            {responses.length > 0 && (
              <button
                onClick={exportToExcel}
                className="px-6 py-2 bg-green-700 text-white font-medium rounded hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
              >
                Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {responses.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'summary'
                    ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📊 Summary & Analytics
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'individual'
                    ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                👤 Individual Responses
              </button>
              <button
                onClick={() => setActiveTab('lower-feedback')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'lower-feedback'
                    ? 'text-red-700 border-b-2 border-red-700 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                ⚠️ Lower Feedbacks
              </button>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {responses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</p>
            <p className="text-gray-600">No responses have been submitted for this form.</p>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && renderSummaryView()}
            {activeTab === 'individual' && renderIndividualView()}
            {activeTab === 'lower-feedback' && renderLowerFeedbackView()}
          </>
        )}
      </div>

      {/* Re-Feedback QR Code Modal */}
      <QRCodeModal
        isOpen={reFeedbackQR.isOpen}
        onClose={() => setReFeedbackQR({ isOpen: false, link: '', title: '' })}
        formLink={reFeedbackQR.link}
        formTitle={reFeedbackQR.title}
      />
    </div>
  );
};

export default ViewResponses;
