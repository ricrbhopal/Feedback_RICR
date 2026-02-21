import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../config/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const ViewResponses = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'individual', or 'lower-feedback'
  const [selectedStudent, setSelectedStudent] = useState('');
  const [lowerFeedbacks, setLowerFeedbacks] = useState([]);
  const [selectedLowerFeedbackStudent, setSelectedLowerFeedbackStudent] = useState('');

  const fetchResponses = async (resetFilters = false) => {
    try {
      setLoading(true);
      
      // Reset batch filter if requested
      if (resetFilters) {
        setSelectedBatches([]);
      }

      const params = {};
      if (!resetFilters && selectedBatches.length > 0) {
        params.batches = selectedBatches.join(',');
      }

      const res = await api.get(`/responses/${formId}/responses`, { params });
      const data = res.data.data;
      
      setAllResponses(data);
      
      // Only set responses if batches are selected, otherwise keep it empty
      if (selectedBatches.length > 0) {
        setResponses(data);
      } else {
        setResponses([]);
      }
      
      // Set available batches from backend
      if (res.data.batches) {
        setAvailableBatches(res.data.batches);
      }
    } catch (error) {
      console.error("Error fetching responses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [formId, selectedBatches]);

  const handleBatchToggle = (batch) => {
    setSelectedBatches(prev => 
      prev.includes(batch) 
        ? prev.filter(b => b !== batch)
        : [...prev, batch]
    );
  };

  const removeBatch = (batch) => {
    setSelectedBatches(prev => prev.filter(b => b !== batch));
  };

  const exportToExcel = async () => {
    if (responses.length === 0) {
      toast.error('No data to export. Please select batches first.');
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
          new Date(response.submittedAt).toLocaleDateString(),
          new Date(response.submittedAt).toLocaleTimeString()
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

  // Calculate average star rating
  const calculateAverageRating = (questionId) => {
    let totalRating = 0;
    let ratingCount = 0;

    responses.forEach(response => {
      const answer = response.answers.find(a => a.questionId.toString() === questionId.toString());
      if (answer && answer.answer) {
        const rating = parseInt(answer.answer);
        if (rating) {
          totalRating += rating;
          ratingCount += 1;
        }
      }
    });

    return ratingCount > 0 ? totalRating / ratingCount : 0;
  };

  // Process data for visualizations
  const processDataForCharts = () => {
    if (responses.length === 0 || !responses[0].form) return {};

    const questions = responses[0].form.questions;
    const chartData = {};

    questions.forEach(question => {
      const questionId = question._id.toString();
      
      if (question.type === 'mcq' || question.type === 'yes_no') {
        // Pie chart data for MCQ and Yes/No
        const optionCounts = {};
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer) {
            const answerValue = answer.answer;
            optionCounts[answerValue] = (optionCounts[answerValue] || 0) + 1;
          }
        });
        
        chartData[questionId] = {
          type: 'pie',
          questionText: question.questionText,
          questionType: question.type,
          data: Object.entries(optionCounts).map(([name, value]) => ({ name, value }))
        };
      } else if (question.type === 'star_rating') {
        // Bar chart data for Star Rating
        const starCounts = {};
        const maxStars = question.maxStars || 5;
        
        // Initialize all star values
        for (let i = 1; i <= maxStars; i++) {
          starCounts[i] = 0;
        }
        
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer) {
            const rating = parseInt(answer.answer);
            if (rating >= 1 && rating <= maxStars) {
              starCounts[rating] = (starCounts[rating] || 0) + 1;
            }
          }
        });
        
        const avgRating = calculateAverageRating(questionId);
        const percentage = maxStars > 0 ? (avgRating / maxStars) * 100 : 0;
        
        chartData[questionId] = {
          type: 'bar',
          questionText: question.questionText,
          maxStars: maxStars,
          averageRating: avgRating,
          percentage: percentage,
          data: Object.entries(starCounts).map(([stars, count]) => ({ 
            stars: `${stars} Star${stars > 1 ? 's' : ''}`, 
            count 
          }))
        };
      } else if (question.type === 'short' || question.type === 'paragraph') {
        // Distinct text answers
        const distinctAnswers = new Set();
        responses.forEach(response => {
          const answer = response.answers.find(a => a.questionId.toString() === questionId);
          if (answer && answer.answer && answer.answer.trim()) {
            distinctAnswers.add(answer.answer.trim());
          }
        });
        
        chartData[questionId] = {
          type: 'text',
          questionText: question.questionText,
          questionType: question.type,
          data: Array.from(distinctAnswers)
        };
      }
    });

    return chartData;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Get color for Yes/No questions
  const getYesNoColor = (answer) => {
    if (answer === 'Yes') return '#10B981'; // Green
    if (answer === 'No') return '#EF4444'; // Red
    return '#6B7280'; // Gray for other cases
  };

  // Extract lower feedbacks: Students who answered "No" to Yes/No or rated < 8 stars
  const extractLowerFeedbacks = () => {
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

        // Check for "No" in Yes/No questions
        if (question.type === 'yes_no' && answerObj.answer === 'No') {
          isLowerFeedback = true;
        }

        // Check for rating < 8 in Star Rating questions
        if (question.type === 'star_rating') {
          const rating = parseInt(answerObj.answer);
          if (rating < 8) {
            isLowerFeedback = true;
          }
        }

        if (isLowerFeedback) {
          lowerFeedbackList.push({
            studentName: response.studentName,
            batch: response.batch,
            submittedAt: response.submittedAt,
            questionText: question.questionText,
            questionType: question.type,
            answer: answerObj.answer,
            questionId: question._id
          });
        }
      });
    });

    return lowerFeedbackList;
  };

  const renderLowerFeedbackView = () => {
    const lowerFeedbacks = extractLowerFeedbacks();

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
                    <p className="text-lg font-semibold text-gray-900">{new Date(selectedStudentResponse.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Submission Time</p>
                    <p className="text-lg font-semibold text-gray-900">{new Date(selectedStudentResponse.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

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
                        <div className="flex items-center gap-3">
                          <span className="text-lg">⭐</span>
                          <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded font-bold text-base">
                            {feedback.answer} out of 10
                          </span>
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

  const renderSummaryView = () => {
    const chartData = processDataForCharts();
    
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
                <div className="w-full md:w-1/2" style={{ minWidth: 300, minHeight: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.data.map((entry, index) => {
                          const fillColor = data.questionType === 'yes_no' 
                            ? getYesNoColor(entry.name)
                            : COLORS[index % COLORS.length];
                          return <Cell key={`cell-${index}`} fill={fillColor} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {data.data.map((entry, idx) => {
                    const boxColor = data.questionType === 'yes_no' 
                      ? getYesNoColor(entry.name)
                      : COLORS[idx % COLORS.length];
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: boxColor }}
                        />
                        <span className="text-sm text-gray-700">
                          {entry.name}: <span className="font-semibold">{entry.value}</span> responses
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.type === 'bar' && (
              <div className="relative" style={{ minHeight: 300 }}>
                {/* Small Average Rating Badge in Corner */}
                <div className="absolute top-0 right-0 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 z-10">
                  <p className="text-xs font-semibold text-gray-600">AVG</p>
                  <p className="text-2xl font-bold text-blue-600">{data.averageRating.toFixed(1)}</p>
                </div>

                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stars" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3B82F6" name="Number of Responses" />
                  </BarChart>
                </ResponsiveContainer>
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
                {response.studentName} {response.batch ? `(${response.batch})` : ''} - {new Date(response.submittedAt).toLocaleDateString()}
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
                  {new Date(selectedResponse.submittedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(selectedResponse.submittedAt).toLocaleTimeString()}
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
                    const rating = parseInt(answerObj.answer) || 0;
                    const maxStars = question.maxStars || 5;
                    return (
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
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
            to="/teacher/dashboard"
            className="text-blue-700 hover:text-blue-900 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Form Responses</h1>
          
          {/* Batch Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Filter by Batch
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                onChange={(e) => {
                  if (e.target.value && !selectedBatches.includes(e.target.value)) {
                    handleBatchToggle(e.target.value);
                  }
                  e.target.value = '';
                }}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
              >
                <option value="">Select batch...</option>
                {availableBatches.map((batch) => (
                  <option key={batch} value={batch} disabled={selectedBatches.includes(batch)}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Selected Batches Tags */}
            {selectedBatches.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedBatches.map((batch) => (
                  <div
                    key={batch}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    <span>{batch}</span>
                    <button
                      onClick={() => removeBatch(batch)}
                      className="hover:text-blue-900"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Responses Count and Export */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-lg font-medium text-gray-900">
            Total Responses: {responses.length}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => fetchResponses(true)}
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
        {selectedBatches.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">No Batch Selected</p>
            <p className="text-gray-600">Please select at least one batch from the filter above to view responses.</p>
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">No responses found for the selected batch(es).</p>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && renderSummaryView()}
            {activeTab === 'individual' && renderIndividualView()}
            {activeTab === 'lower-feedback' && renderLowerFeedbackView()}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewResponses;
