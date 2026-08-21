import type { AppLanguage } from "@/lib/language";

export type TranslationKey =
  | "nav.dashboard"
  | "nav.students"
  | "nav.leads"
  | "nav.classes"
  | "nav.tutors"
  | "nav.tuitions"
  | "nav.payments"
  | "nav.purchases"
  | "payments.subtitle"
  | "payments.tabsAria"
  | "payments.tabPayments"
  | "payments.tabPurchases"
  | "nav.statements"
  | "nav.attendance"
  | "nav.schedule"
  | "nav.events"
  | "nav.settings"
  | "nav.myHours"
  | "nav.chat"
  | "brand.musicSchool"
  | "settings.title"
  | "settings.subtitleAdmin"
  | "settings.subtitleSelf"
  | "settings.yourAccount"
  | "settings.signedInAs"
  | "settings.tabsAria"
  | "settings.tabGeneral"
  | "settings.tabStaff"
  | "settings.tabTeachers"
  | "settings.staffAccounts"
  | "settings.staffAccountsDescription"
  | "settings.teacherAccounts"
  | "settings.teacherAccountsDescription"
  | "settings.trialPricing"
  | "settings.trialPricingDescription"
  | "settings.trialFee"
  | "settings.trialTeacherPay"
  | "settings.editTrialPricing"
  | "settings.updatedTrialPricing"
  | "settings.language"
  | "settings.languageDescription"
  | "settings.languageSaved"
  | "settings.saveLanguage"
  | "settings.savingLanguage"
  | "common.openSidebar"
  | "common.closeSidebar"
  | "common.hideSidebar"
  | "common.showSidebar"
  | "common.resizeSidebar"
  | "common.notAvailable"
  | "common.active"
  | "common.inactive"
  | "teacherStatus.active"
  | "teacherStatus.onLeave"
  | "teacherStatus.inactive"
  | "common.changeTeacherStatus"
  | "common.save"
  | "common.saving"
  | "common.loading"
  | "common.cancel"
  | "common.delete"
  | "common.confirm"
  | "common.deleting"
  | "common.signOut"
  | "common.status"
  | "common.edit"
  | "common.add"
  | "common.remove"
  | "common.close"
  | "common.back"
  | "common.actions"
  | "common.name"
  | "common.dateOfBirth"
  | "common.birthday"
  | "common.id"
  | "common.email"
  | "common.phone"
  | "staffPosition.teacher"
  | "staffPosition.frontDesk"
  | "common.position"
  | "common.hourlyRate"
  | "common.hourlyRatePlaceholder"
  | "common.hoursWorked"
  | "common.workDate"
  | "common.clockIn"
  | "common.clockOut"
  | "common.durationHoursMinutes"
  | "common.monthTotal"
  | "common.clickDayToLog"
  | "common.logHours"
  | "common.editHours"
  | "common.saveHours"
  | "common.noHourLogs"
  | "common.deleteHourLogConfirm"
  | "common.dayPay"
  | "common.hoursPaySummary"
  | "common.frontDeskNoClasses"
  | "common.linkFrontDeskTeacher"
  | "common.createNewFrontDeskTeacher"
  | "common.frontDeskAccountHelp"
  | "common.noFrontDeskTeachers"
  | "common.myHoursTitle"
  | "common.myHoursSubtitle"
  | "common.frontDeskProfileMissing"
  | "common.linkedLoginAccount"
  | "common.linkedLoginAccountHelp"
  | "common.hoursSyncHint"
  | "common.chooseFrontDeskAccount"
  | "common.linkAccount"
  | "common.unlinkAccount"
  | "common.noUnlinkedFrontDeskAccounts"
  | "common.linkedTeacher"
  | "common.phones"
  | "common.noPhones"
  | "common.addPhone"
  | "common.editPhone"
  | "common.savePhone"
  | "common.deletePhoneConfirm"
  | "common.phoneOwner"
  | "common.ownerName"
  | "common.ownerNamePlaceholder"
  | "common.primaryPhone"
  | "phoneOwner.self"
  | "phoneOwner.mother"
  | "phoneOwner.father"
  | "phoneOwner.grandmother"
  | "phoneOwner.grandfather"
  | "phoneOwner.guardian"
  | "phoneOwner.aunt"
  | "phoneOwner.uncle"
  | "phoneOwner.sibling"
  | "phoneOwner.other"
  | "common.teacher"
  | "common.resume"
  | "common.resumeHelp"
  | "common.uploadResume"
  | "common.replaceResume"
  | "common.viewResume"
  | "common.removeResume"
  | "common.noResumeYet"
  | "common.room"
  | "common.subject"
  | "common.instrument"
  | "common.track"
  | "common.type"
  | "common.schedule"
  | "common.duration"
  | "common.typicalDurationOptional"
  | "common.durationMinutesPlaceholder"
  | "common.lessonLengthHelp"
  | "common.typicalDurationHelp"
  | "common.student"
  | "common.class"
  | "common.date"
  | "common.day"
  | "common.time"
  | "common.scheduleStudentOptional"
  | "common.amount"
  | "common.category"
  | "common.plan"
  | "common.total"
  | "common.remaining"
  | "common.used"
  | "common.absences"
  | "common.role"
  | "common.campus"
  | "common.added"
  | "common.processing"
  | "common.continue"
  | "common.decline"
  | "common.noResults"
  | "common.noMatchSearch"
  | "common.error.loadFailed"
  | "common.empty.runSeed"
  | "common.viewAll"
  | "common.fullSchedule"
  | "common.new"
  | "common.today"
  | "common.previous"
  | "common.next"
  | "common.clear"
  | "common.all"
  | "common.of"
  | "common.hour"
  | "common.hours"
  | "common.minutes"
  | "common.noTeacherAssigned"
  | "common.addRoom"
  | "common.changeRoom"
  | "common.assignRoom"
  | "common.noRoomAssigned"
  | "common.editTeachers"
  | "common.editTeachersHelp"
  | "common.saveTeachers"
  | "common.saveRoom"
  | "common.inSession"
  | "common.noStudentsEnrolled"
  | "common.trialLabel"
  | "common.enrolled"
  | "common.viewClass"
  | "common.when"
  | "common.notes"
  | "common.note"
  | "common.editNotes"
  | "common.studentNotesPlaceholder"
  | "common.viewStudentNotes"
  | "common.noStudentNotes"
  | "common.receipts"
  | "common.receiptsHelp"
  | "common.receiptPhoto"
  | "common.receiptNotePlaceholder"
  | "common.saveReceipt"
  | "common.allReceipts"
  | "common.noReceiptsYet"
  | "common.viewReceipt"
  | "common.optional"
  | "common.description"
  | "common.year"
  | "common.month"
  | "common.reason"
  | "common.editAmount"
  | "common.editPaymentAmount"
  | "common.editPurchaseAmount"
  | "common.editPaycheckAmount"
  | "common.editStatementAmount"
  | "common.editRecurringAmount"
  | "common.editPricing"
  | "common.changePricing"
  | "common.deletePricing"
  | "common.deletePricingConfirm"
  | "common.deletePricingFieldConfirm"
  | "common.clearedClassPricing"
  | "common.noLinkedClass"
  | "common.editGrade"
  | "common.editGradeLevel"
  | "common.editCredits"
  | "common.editClassCredits"
  | "common.editClassCreditsHelp"
  | "common.gradeLevel"
  | "common.noGradeLevel"
  | "common.customGradeLevel"
  | "common.gradeLevelHelp"
  | "common.artMaterialFeeNote"
  | "common.monthlyRateOnly"
  | "common.specialPacks"
  | "common.specialPacksSubtitle"
  | "common.addSpecialPack"
  | "common.noSpecialPacks"
  | "common.specialPackPriceHelp"
  | "common.promoActiveNow"
  | "common.promoScheduled"
  | "common.promoBadge"
  | "common.dates"
  | "common.startDate"
  | "common.endDate"
  | "common.originalAmount"
  | "common.currentAmount"
  | "common.newAmount"
  | "common.saveCorrection"
  | "common.correctionReasonPlaceholder"
  | "common.correctionKeepsHistory"
  | "common.manualEntryCorrectionHelp"
  | "common.recurringAmountEditHelp"
  | "common.fromCorrection"
  | "common.singleClassPrice"
  | "common.package20Price"
  | "common.package50Price"
  | "common.updatedClassPricing"
  | "common.credits"
  | "common.noCreditsLeft"
  | "common.notMarked"
  | "common.makeUp"
  | "common.creditUsed"
  | "common.noDataYet"
  | "common.searchStudents"
  | "common.searchStudentsByName"
  | "common.searchTutorsByName"
  | "common.searchClasses"
  | "common.searchStaff"
  | "common.searchTeachers"
  | "common.searchSubjects"
  | "common.noSubjectsFound"
  | "common.useCustomSubject"
  | "common.selectStudent"
  | "common.selectTeacher"
  | "common.selectClass"
  | "common.selectSubject"
  | "common.selectType"
  | "common.selectTime"
  | "common.noClassTypesAvailable"
  | "common.noClassTimesAvailable"
  | "common.noScheduledTime"
  | "common.noStudentsYet"
  | "common.noStudentsFound"
  | "common.noTutorsYet"
  | "common.noTutorsFound"
  | "common.noClassesYet"
  | "common.noClassesFound"
  | "common.noClassesAvailable"
  | "common.noAccountsYet"
  | "common.noAccountsMatchSearch"
  | "common.noActiveEntity"
  | "common.noInactiveEntity"
  | "common.countActiveEntity"
  | "common.countActiveEntityPlural"
  | "common.countFilteredEntity"
  | "common.countInactiveEntity"
  | "common.countInactiveEntityPlural"
  | "common.countFilteredInactiveEntity"
  | "common.noClassesInTrackNamed"
  | "common.oneStatusClassInTrack"
  | "common.countStatusClassesInTrack"
  | "common.filteredStatusClassesInTrack"
  | "common.accountCount"
  | "common.accountCountPlural"
  | "common.countFilteredAccounts"
  | "common.packageCountPack"
  | "common.backToStudents"
  | "common.backToClasses"
  | "common.backToTutors"
  | "common.backToTeacher"
  | "common.backToStudent"
  | "common.backToSchedule"
  | "common.backToLeads"
  | "common.backToDashboard"
  | "common.backToStatements"
  | "common.redNamesNoCredits"
  | "common.lessonType"
  | "common.unassigned"
  | "common.activate"
  | "common.deactivate"
  | "common.cannotDeactivateSelf"
  | "common.deleteAccount"
  | "common.deleteAccountConfirm"
  | "common.cannotDeleteSelf"
  | "common.street"
  | "common.city"
  | "common.state"
  | "common.zip"
  | "common.address"
  | "common.noAddresses"
  | "common.perClass"
  | "common.package20"
  | "common.package50"
  | "common.trial"
  | "common.income"
  | "common.expenses"
  | "common.net"
  | "common.fixedExpenses"
  | "common.variableExpenses"
  | "common.noIncome"
  | "common.noExpenses"
  | "common.noFixedExpenses"
  | "common.noVariableExpenses"
  | "common.fromPayment"
  | "common.fromPurchase"
  | "common.fromPaycheck"
  | "common.fromFrontDeskPay"
  | "common.fromRecurring"
  | "common.addIncome"
  | "common.addExpense"
  | "common.saveEntry"
  | "common.addEntry"
  | "common.recurringEntries"
  | "common.deleteRecurringEntry"
  | "common.deleteStatementEntryConfirm"
  | "common.deleteTeacherPaycheckStatementConfirm"
  | "common.deleteFrontDeskPayStatementConfirm"
  | "common.deleteRecurringStatementInstanceConfirm"
  | "common.dayOfMonth"
  | "common.totalIncome"
  | "common.mark"
  | "common.go"
  | "common.pickDate"
  | "common.markAllPresent"
  | "common.markedPresent"
  | "common.noEnrolledStudents"
  | "common.selectStudentAbove"
  | "common.noClassesScheduled"
  | "common.allTeachers"
  | "common.previousWeek"
  | "common.nextWeek"
  | "common.previousDay"
  | "common.nextDay"
  | "common.weekView"
  | "common.dayView"
  | "common.teacherDayList"
  | "common.teacherDayListHelp"
  | "common.addStudentToSchedule"
  | "common.addStudentToScheduleHelp"
  | "common.addGroupClassToSchedule"
  | "common.addGroupClassToScheduleHelp"
  | "common.selectTeacherToAddStudent"
  | "common.teacherStudents"
  | "common.searchTeacherStudents"
  | "common.students"
  | "common.selectAtLeastOneStudent"
  | "common.createNewClass"
  | "common.addToSchedule"
  | "common.clickEmptySlotToAdd"
  | "common.downloadPdf"
  | "common.pdfPrintHint"
  | "common.pdfPopupBlocked"
  | "common.frontDeskTimesheet"
  | "common.noHoursLoggedThisMonth"
  | "common.paycheckReceivedAck"
  | "common.signature"
  | "common.hideTeacherFilters"
  | "common.showTeacherFilters"
  | "common.clearFilter"
  | "common.showingClassesFor"
  | "common.noScheduledClasses"
  | "common.noScheduleYet"
  | "common.reschedule"
  | "common.rescheduledThisWeek"
  | "common.repeatsWeekly"
  | "common.saveChanges"
  | "common.addTime"
  | "common.addMeetingTime"
  | "common.editMeetingTime"
  | "common.copy"
  | "common.copyMeetingTime"
  | "common.copyClass"
  | "common.copyClassHelp"
  | "common.changeTime"
  | "common.removeMeetingTime"
  | "common.removeMeetingTimeConfirm"
  | "common.recordPayment"
  | "common.recordPurchase"
  | "common.noPaymentsYet"
  | "common.noPurchasesYet"
  | "common.confirmPayment"
  | "common.confirmPurchase"
  | "common.paymentRecorded"
  | "common.purchaseRecorded"
  | "common.refundCredits"
  | "common.exchangeCredits"
  | "common.transferTo"
  | "common.allCreditsFromPayment"
  | "common.howManyClasses"
  | "common.selectStudentFirst"
  | "common.selectTeacherFirst"
  | "common.selectClassFirst"
  | "common.selectSubjectFirst"
  | "common.selectTypeFirst"
  | "common.selectTimeFirst"
  | "common.createEvent"
  | "common.postEvent"
  | "common.posting"
  | "common.deletePost"
  | "common.deletePostConfirm"
  | "common.noEventsYet"
  | "common.createFirstEvent"
  | "common.shareFirstUpdate"
  | "common.newPostsInDays"
  | "common.latestNews"
  | "common.photosVideos"
  | "common.changePassword"
  | "common.currentPassword"
  | "common.newPassword"
  | "common.confirmPassword"
  | "common.updatePassword"
  | "common.passwordUpdated"
  | "common.setPassword"
  | "common.setManagerPasswordHelp"
  | "common.setManagerPasswordHint"
  | "common.addStaffAccount"
  | "common.addManager"
  | "common.addTeacherAccount"
  | "common.addTeacherAccountHelp"
  | "common.linkTeacherProfile"
  | "common.createNewTeacherProfile"
  | "common.noTeacherProfiles"
  | "common.addStatenIslandManager"
  | "chat.title"
  | "chat.subtitle"
  | "chat.pickTeacher"
  | "chat.pickConversation"
  | "chat.noTeachers"
  | "chat.noConversations"
  | "chat.noMessages"
  | "chat.selectTeacherHint"
  | "chat.selectConversationHint"
  | "chat.fromTeacher"
  | "chat.fromStudent"
  | "chat.messageCount"
  | "chat.conversationCount"
  | "chat.lastActive"
  | "common.createAccount"
  | "common.creating"
  | "common.enrolling"
  | "common.adding"
  | "common.recording"
  | "common.deducting"
  | "common.marking"
  | "common.grant"
  | "common.refund"
  | "common.writeOff"
  | "common.makeUpCredit"
  | "common.creditsToAdd"
  | "common.sessionDate"
  | "common.creditCost"
  | "common.allCredits"
  | "common.deductClass"
  | "common.markAbsent"
  | "common.classDeducted"
  | "common.markedAbsent"
  | "common.paycheck"
  | "common.ratePerClass"
  | "common.totalPaycheck"
  | "common.reviewPaycheck"
  | "common.confirmPaycheck"
  | "common.noPaycheckPeriods"
  | "common.viewInStatements"
  | "common.recorded"
  | "common.addNewStudent"
  | "common.addNewStudents"
  | "common.addNewTutor"
  | "common.addNewClass"
  | "common.addCourse"
  | "common.addCourseHelp"
  | "common.courseName"
  | "common.courseNamePlaceholder"
  | "common.renameCourse"
  | "common.deleteCourse"
  | "common.deleteCourseConfirm"
  | "common.saveStudent"
  | "common.saveTutor"
  | "common.saveClass"
  | "common.saveClasses"
  | "common.saveAddress"
  | "common.addToClass"
  | "common.addToClasses"
  | "common.addStudents"
  | "common.enrollStudent"
  | "common.removeFromClass"
  | "common.removeClass"
  | "common.deleteStudent"
  | "common.deleteStudentConfirm"
  | "common.deleteTeacher"
  | "common.deleteTeacherConfirm"
  | "common.deleteClass"
  | "common.deleteClassConfirm"
  | "common.deleteTrialConfirm"
  | "common.deleteAddress"
  | "common.deleteAddressConfirm"
  | "common.editDateOfBirth"
  | "common.editClass"
  | "common.editTutor"
  | "common.editStudent"
  | "common.editPageHelp"
  | "common.editAddress"
  | "common.addAddress"
  | "common.assignClasses"
  | "common.createClassForTeacherHelp"
  | "common.firstName"
  | "common.lastName"
  | "common.startingClassSessions"
  | "common.startingClassSessionsHelp"
  | "common.street1"
  | "common.street2"
  | "common.selectState"
  | "common.classCredits"
  | "common.classHistory"
  | "common.classHistoryHelp"
  | "common.allTimeByClass"
  | "common.notEnrolled"
  | "common.totalClassesTaken"
  | "common.studentId"
  | "common.tutorId"
  | "common.classId"
  | "common.classes"
  | "common.enrollToTrack"
  | "common.classCreditsTitle"
  | "common.attendanceHistory"
  | "common.previousMonth"
  | "common.nextMonth"
  | "common.selectHighlightedDate"
  | "common.noSessionsOnDate"
  | "common.sessionsOnDate"
  | "common.purchases"
  | "common.deleteClassSchedule"
  | "common.scheduleHelp"
  | "common.noMeetingTimes"
  | "common.activeEnrollment"
  | "common.inactiveEnrollment"
  | "common.toggleActiveStatus"
  | "common.quickLinks"
  | "common.todaysOverview"
  | "common.happeningNow"
  | "common.classesInSession"
  | "common.noClassesMeetingNow"
  | "common.comingUpToday"
  | "common.classesStillScheduled"
  | "common.noMoreClassesToday"
  | "common.lowCreditsTitle"
  | "common.lowCreditsSubtitle"
  | "common.lowCreditsEmpty"
  | "common.creditsRemainingCount"
  | "common.allTracks"
  | "common.classTracks"
  | "common.noClassesInTrack"
  | "common.tuitionsSubtitle"
  | "sheet.officialTitle"
  | "sheet.officialSubtitle"
  | "sheet.piano1v1"
  | "sheet.violin1v1"
  | "sheet.level1v1Hint"
  | "sheet.otherInstrument1v1"
  | "sheet.choirOrchestraTheory"
  | "sheet.talentExam"
  | "sheet.specialtyGroup"
  | "sheet.art"
  | "sheet.dance"
  | "sheet.band"
  | "sheet.art1v1"
  | "sheet.grade.g0_2"
  | "sheet.grade.g3_4"
  | "sheet.grade.g5_6"
  | "sheet.grade.g7_8"
  | "sheet.grade.performance"
  | "sheet.perMonth"
  | "sheet.materialFeeAdd"
  | "sheet.danceBagAdd"
  | "sheet.bandMonthlyNote"
  | "sheet.otherClasses"
  | "sheet.otherClassesSubtitle"
  | "common.paymentsSubtitle"
  | "common.purchasesSubtitle"
  | "common.statementsSubtitle"
  | "common.attendanceSubtitle"
  | "common.scheduleSubtitle"
  | "common.eventsSubtitle"
  | "common.attendanceFooter"
  | "common.rescheduleThisOccurrence"
  | "common.rescheduleAllFuture"
  | "common.deleteFromCalendar"
  | "common.deleteThisOccurrence"
  | "common.deleteAllOccurrences"
  | "common.deleteScheduleEventConfirm"
  | "common.deleteTrialFromCalendarConfirm"
  | "common.deleteAllOccurrencesConfirm"
  | "common.originalTime"
  | "common.newTime"
  | "common.originalDuration"
  | "common.newDuration"
  | "common.changeDuration"
  | "common.updateClassTime"
  | "common.searchClassesPrices"
  | "common.packageOff"
  | "common.trialNoPackages"
  | "common.classCount"
  | "common.classCountPlural"
  | "common.studentsMarked"
  | "common.studentCount"
  | "common.studentCountPlural"
  | "common.alreadyMarked"
  | "common.areYouSure"
  | "common.confirmPaycheckTitle"
  | "common.confirmPaycheckHelp"
  | "common.confirmAndRecordPaycheck"
  | "common.reviewFrontDeskPay"
  | "common.confirmFrontDeskPayTitle"
  | "common.confirmFrontDeskPayHelp"
  | "common.confirmAndSubmitFrontDeskPay"
  | "common.frontDeskPayAlreadyRecorded"
  | "common.noFrontDeskHoursToSubmit"
  | "common.noPostsYet"
  | "common.photos"
  | "common.videos"
  | "common.mediaCount"
  | "common.previousMedia"
  | "common.nextMedia"
  | "common.weekly"
  | "common.oneTime"
  | "common.startTime"
  | "common.endTime"
  | "common.am"
  | "common.pm"
  | "common.hourInput"
  | "common.minuteInput"
  | "common.amPm"
  | "common.noLocation"
  | "common.location"
  | "common.noStaffAccounts"
  | "common.couldNotLoadStaff"
  | "common.creditsButton"
  | "common.exchange"
  | "common.writeOffAction"
  | "common.refundAction"
  | "common.grantAction"
  | "common.makeUpAction"
  | "common.searchClassesFull"
  | "common.searchAndSelectClasses"
  | "common.searchAndSelectStudents"
  | "common.searchAndSelectTeachers"
  | "common.assignMultipleTeachersHelp"
  | "common.addNewTutorInline"
  | "common.noTutorsAddFirst"
  | "common.noRoomsAvailable"
  | "common.placeholderSubject"
  | "common.placeholderDescription"
  | "common.placeholderPurchase"
  | "common.placeholderEventTitle"
  | "common.placeholderEventBody"
  | "common.purchaseDescription"
  | "common.confirmPurchaseTitle"
  | "common.confirmPaymentTitle"
  | "common.paymentPlanHelp"
  | "common.singleClassLabel"
  | "common.activeEnrolled"
  | "common.activeEnrolledSummary"
  | "common.studentsEnrolled"
  | "common.noStudentsEnrolledInClass"
  | "common.classPayments"
  | "common.studentPurchases"
  | "common.teacherPaycheck"
  | "common.statementMonthIncome"
  | "common.statementMonthExpense"
  | "common.allExpenses"
  | "common.fixedExpensesTab"
  | "common.variableExpensesTab"
  | "common.recurringExpense"
  | "common.addRecurringEntry"
  | "common.noRecurringEntries"
  | "common.recurringEntriesHelp"
  | "common.statementEntries"
  | "common.noStatementsYet"
  | "common.statementsListHelp"
  | "common.auth.signIn"
  | "common.auth.signingIn"
  | "common.auth.signInTitle"
  | "common.auth.emailAddress"
  | "common.auth.password"
  | "common.auth.needAccount"
  | "common.auth.brooklynAdmin"
  | "common.auth.signInDescription"
  | "enum.classTrack.instrumental"
  | "enum.classTrack.vocal"
  | "enum.classTrack.composition"
  | "enum.classTrack.dance"
  | "enum.classTrack.music_education"
  | "enum.classTrack.other"
  | "enum.lessonType.private"
  | "enum.lessonType.group"
  | "enum.lessonType.trial"
  | "enum.paymentClassType.trial"
  | "enum.paymentClassType.private"
  | "enum.paymentClassType.group"
  | "enum.paymentStatus.completed"
  | "enum.paymentStatus.refunded"
  | "enum.paymentStatus.exchanged"
  | "enum.paymentPlan.single"
  | "enum.paymentPlan.package"
  | "enum.attendance.present"
  | "enum.attendance.late"
  | "enum.attendance.absent"
  | "enum.attendance.excused"
  | "enum.attendanceDescription.present"
  | "enum.attendanceDescription.late"
  | "enum.attendanceDescription.absent"
  | "enum.attendanceDescription.excused"
  | "enum.staffRole.admin"
  | "enum.staffRole.manager"
  | "enum.staffRole.teacher"
  | "enum.staffRole.frontDesk"
  | "enum.staffLocation.brooklyn"
  | "enum.staffLocation.staten_island"
  | "enum.staffLocation.brooklynLabel"
  | "enum.staffLocation.statenIslandLabel"
  | "enum.leadStatus.new"
  | "enum.leadStatus.contacted"
  | "enum.leadStatus.enrolled"
  | "enum.leadStatus.closed"
  | "leads.subtitle"
  | "leads.empty"
  | "leads.addLead"
  | "leads.addLeadDescription"
  | "leads.editLead"
  | "leads.deleteLead"
  | "leads.deleteLeadConfirm"
  | "leads.parentInfo"
  | "leads.parentFirstName"
  | "leads.parentLastName"
  | "leads.studentInfo"
  | "leads.studentFirstName"
  | "leads.studentLastName"
  | "leads.studentFirstNameRequired"
  | "leads.address"
  | "leads.contact"
  | "leads.needsFutureContact"
  | "leads.noFutureContactNeeded"
  | "leads.description"
  | "leads.descriptionPlaceholder"
  | "leads.noDescription"
  | "leads.children"
  | "leads.noChildren"
  | "leads.addChild"
  | "leads.editChild"
  | "leads.deleteChildConfirm"
  | "leads.childLastName"
  | "leads.background"
  | "leads.backgroundPlaceholder"
  | "leads.experience"
  | "leads.experiencePlaceholder"
  | "leads.searchPlaceholder"
  | "leads.countShown"
  | "leads.summaryTabs"
  | "leads.tabAll"
  | "leads.tabThisMonth"
  | "leads.tabInquiries"
  | "leads.tabTrials"
  | "leads.type"
  | "leads.typeInquiry"
  | "leads.typeTrial"
  | "leads.emptyThisMonth"
  | "leads.emptyInquiries"
  | "leads.emptyTrials"
  | "leads.makeOfficial"
  | "leads.makeOfficialDescription"
  | "leads.makeOfficialHelp"
  | "leads.makeTrialOfficialDescription"
  | "leads.makeTrialOfficialHelp"
  | "leads.addNewStudent"
  | "leads.studentFirstName"
  | "leads.studentLastName"
  | "leads.trialOneClassOnly"
  | "leads.viewLead"
  | "leads.monthSummaryTitle"
  | "leads.monthSummarySubtitle"
  | "leads.createdAt"
  | "leads.updatedAt"
  | "leads.convertToStudent"
  | "leads.convertToStudentDescription"
  | "leads.convertAllToStudents"
  | "leads.convertAllDescription"
  | "leads.startingClassSessions"
  | "leads.convertAddressNote"
  | "leads.viewStudent"
  | "leads.notYetStudent"
  | "leads.parentFirstNameRequired"
  | "leads.phoneRequired"
  | "enum.month.january"
  | "enum.month.february"
  | "enum.month.march"
  | "enum.month.april"
  | "enum.month.may"
  | "enum.month.june"
  | "enum.month.july"
  | "enum.month.august"
  | "enum.month.september"
  | "enum.month.october"
  | "enum.month.november"
  | "enum.month.december"
  | "format.statementMonth"
  | "enum.statementEntryType.income"
  | "enum.statementEntryType.expense"
  | "enum.statementExpenseCategory.fixed"
  | "enum.statementExpenseCategory.variable"
  | "enum.weekday.sunday"
  | "enum.weekday.monday"
  | "enum.weekday.tuesday"
  | "enum.weekday.wednesday"
  | "enum.weekday.thursday"
  | "enum.weekday.friday"
  | "enum.weekday.saturday"
  | "enum.schedule.repeatsWeekly"
  | "enum.schedule.oneTime"
  | "enum.schedule.unknownDay"
  | "time.justNow"
  | "time.minutesAgo"
  | "time.hoursAgo"
  | "time.daysAgo"
  | "common.attendancePickDateHelp"
  | "common.classesOnDate"
  | "common.attendanceAllClassesHelp"
  | "common.noClassesOnDate"
  | "common.viewStudentClassesOnly"
  | "common.classCountOnDate"
  | "common.makeupLesson"
  | "common.makeUpClass"
  | "common.teachersToday"
  | "common.allTeachersToday"
  | "common.totalClass"
  | "common.remainingClass"
  | "common.makeupDate"
  | "common.makeupTime"
  | "common.saveMakeup"
  | "common.makeupDialogHelp"
  | "common.makeupScheduled"
  | "common.rescheduleMakeup"
  | "common.noTeachersToday"
  | "common.notScheduled"
  | "common.paymentOptionUnavailable"
  | "common.noActiveClassesFor"
  | "common.recordPaymentDialogHelp"
  | "common.confirmPaymentBeforeRecord"
  | "common.paidFor"
  | "common.addedToStatementsIncome"
  | "common.sessionCount"
  | "common.sessionCountPlural"
  | "common.purchaseRecordedDetail"
  | "common.describePurchase"
  | "common.enterValidAmount"
  | "common.purchasesEmptyHelp"
  | "common.payingFor"
  | "common.confirmPurchaseBeforeRecord"
  | "common.purchaseDialogHelp"
  | "common.whatPayingFor"
  | "common.item"
  | "common.assignClassesForPaycheck"
  | "common.classesThisPeriod"
  | "common.recordedAt"
  | "common.recordedAsExpenseFor"
  | "common.paycheckRatesHelp"
  | "common.subtotal"
  | "common.confirmPaycheckReview"
  | "common.paycheckExpenseWillRecord"
  | "common.statementsAutoMonths"
  | "common.teachers"
  | "common.teacherFilterHelp"
  | "common.clearStudentFilter"
  | "common.noScheduleAddOnClass"
  | "common.showingClassesNoneFound"
  | "common.daysWithClassHistory"
  | "common.noClassHistory"
  | "common.autoRecorded"
  | "common.creditsUsedCount"
  | "common.classHistoryOnDay"
  | "common.selectDateForHistory"
  | "common.showingStaffFor"
  | "common.statenIslandManagerHelp"
  | "common.classTrackLabel"
  | "common.noMeetingTimesAdd"
  | "common.rate"
  | "common.classesColumn"
  | "common.showMedia"
  | "common.enterPayRateForClass"
  | "enum.classTrack.instrumentalDesc"
  | "enum.classTrack.vocalDesc"
  | "enum.classTrack.compositionDesc"
  | "enum.classTrack.danceDesc"
  | "enum.classTrack.music_educationDesc"
  | "enum.classTrack.otherDesc"
  | "common.subjectClassCount"
  | "common.showSubjectClasses"
  | "common.hideSubjectClasses"
  | "common.teacherCount"
  | "common.durationsAvailable"
  | "common.selectTeacherForSubject"
  | "trial.title"
  | "trial.intro"
  | "trial.childName"
  | "trial.lastName"
  | "trial.dob"
  | "trial.gender"
  | "trial.genderMale"
  | "trial.genderFemale"
  | "trial.parentName"
  | "trial.phone"
  | "trial.address"
  | "trial.subject"
  | "trial.oneToOne"
  | "trial.groupClass"
  | "trial.haveStudied"
  | "trial.haveStudiedPlaceholder"
  | "trial.suitableTime"
  | "trial.weekday"
  | "trial.weekend"
  | "trial.duration"
  | "trial.durationUnit"
  | "trial.fee"
  | "trial.feePromoHelp"
  | "trial.feePromo"
  | "trial.teacher"
  | "trial.date"
  | "trial.startTime"
  | "trial.submit"
  | "trial.booking"
  | "trial.booked"
  | "trial.bookedHelp"
  | "trial.bookAnother"
  | "trial.noTeachers"
  | "trial.close"
  | "trial.bookButton"
  | "common.editPayment"
  | "common.editPaymentHelp"
  | "common.savePayment"
  | "common.paidAt";

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.students": "Students",
    "nav.leads": "Leads",
    "nav.classes": "Classes",
    "nav.tutors": "Teachers",
    "nav.tuitions": "Tuitions",
    "nav.payments": "Payments",
    "nav.purchases": "Books & Purchases",
    "payments.subtitle":
      "Record class payments and book or material purchases. Completed amounts appear in Statements automatically.",
    "payments.tabsAria": "Payments sections",
    "payments.tabPayments": "Class payments",
    "payments.tabPurchases": "Books & Purchases",
    "nav.statements": "Statements",
    "nav.attendance": "Attendance",
    "nav.schedule": "Schedule",
    "nav.events": "Events",
    "nav.settings": "Settings",
    "nav.myHours": "My hours",
    "nav.chat": "Chat",
    "brand.musicSchool": "Music School",
    "settings.title": "Settings",
    "settings.subtitleAdmin":
      "Manage staff, campus managers, and teacher app logins for Brooklyn and Staten Island.",
    "settings.subtitleSelf": "Manage your account settings.",
    "settings.yourAccount": "Your account",
    "settings.signedInAs": "Signed in as",
    "settings.tabsAria": "Settings sections",
    "settings.tabGeneral": "General",
    "settings.tabStaff": "Staff",
    "settings.tabTeachers": "Teachers",
    "settings.staffAccounts": "Staff accounts",
    "settings.staffAccountsDescription":
      "Admins, campus managers, and front desk accounts who use the admin console.",
    "settings.teacherAccounts": "Teacher accounts",
    "settings.teacherAccountsDescription":
      "Teachers with app logins. Create accounts here so they can sign in and chat with students.",
    "settings.language": "Language",
    "settings.languageDescription":
      "Choose the language for the admin console. Your choice is saved to your account.",
    "settings.languageSaved": "Language updated.",
    "settings.saveLanguage": "Save language",
    "settings.savingLanguage": "Saving…",
    "common.openSidebar": "Open sidebar",
    "common.closeSidebar": "Close sidebar",
    "common.hideSidebar": "Hide sidebar",
    "common.showSidebar": "Show sidebar",
    "common.resizeSidebar": "Resize sidebar",
    "common.notAvailable": "—",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "teacherStatus.active": "Active",
    "teacherStatus.onLeave": "On leave",
    "teacherStatus.inactive": "Inactive",
    "common.changeTeacherStatus": "Change status for {name}",
    "common.save": "Save",
    "common.saving": "Saving…",
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.deleting": "Deleting…",
    "common.signOut": "Sign out",
    "common.status": "Status",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.close": "Close",
    "common.back": "Back",
    "common.actions": "Actions",
    "common.name": "Name",
    "common.dateOfBirth": "Date of birth",
    "common.birthday": "Birthday",
    "common.id": "ID",
    "common.email": "Email",
    "common.phone": "Phone",
    "staffPosition.teacher": "Teacher",
    "staffPosition.frontDesk": "Front desk",
    "common.position": "Position",
    "common.hourlyRate": "Hourly rate",
    "common.hourlyRatePlaceholder": "e.g. 18.00",
    "common.hoursWorked": "Hours worked",
    "common.workDate": "Work date",
    "common.clockIn": "Clock in",
    "common.clockOut": "Clock out",
    "common.durationHoursMinutes": "{hours}h {minutes}m",
    "common.monthTotal": "Month total",
    "common.clickDayToLog": "Click a day to log when you arrived and left.",
    "common.logHours": "Log hours",
    "common.editHours": "Edit hours",
    "common.saveHours": "Save hours",
    "common.noHourLogs": "No hours logged yet.",
    "common.deleteHourLogConfirm":
      "This will permanently delete this day’s hour log.",
    "common.dayPay": "Pay",
    "common.hoursPaySummary": "{hours} hrs · {pay}",
    "common.frontDeskNoClasses":
      "Front desk staff do not teach classes. Log daily hours below.",
    "common.linkFrontDeskTeacher": "Link to front desk profile",
    "common.createNewFrontDeskTeacher": "Create a new front desk profile",
    "common.frontDeskAccountHelp":
      "Front desk accounts can only open My hours and Schedule. Link an existing front desk teacher, or create a new profile.",
    "common.noFrontDeskTeachers":
      "No unlinked front desk profiles at this campus. A new profile will be created from the name and hourly rate.",
    "common.myHoursTitle": "My hours",
    "common.myHoursSubtitle": "Log when you arrive and leave each day.",
    "common.frontDeskProfileMissing":
      "This account is not linked to a front desk profile. Ask an admin to fix it.",
    "common.linkedLoginAccount": "Linked login account",
    "common.linkedLoginAccountHelp":
      "Connect a front desk login so hours they save appear on this teacher page.",
    "common.hoursSyncHint":
      "Hours logged in My hours show up in the calendar below.",
    "common.chooseFrontDeskAccount": "Front desk login",
    "common.linkAccount": "Link account",
    "common.unlinkAccount": "Unlink",
    "common.noUnlinkedFrontDeskAccounts":
      "No unlinked front desk logins yet. Create one in Settings → Staff accounts with role Front desk, then link it here.",
    "common.linkedTeacher": "Linked teacher",
    "common.phones": "Phone numbers",
    "common.noPhones": "No phone numbers on file.",
    "common.addPhone": "Add phone",
    "common.editPhone": "Edit phone",
    "common.savePhone": "Save phone",
    "common.deletePhoneConfirm":
      "This will permanently delete this phone number.",
    "common.phoneOwner": "Whose phone",
    "common.ownerName": "Contact name",
    "common.ownerNamePlaceholder": "Optional name",
    "common.primaryPhone": "Primary",
    "phoneOwner.self": "Self",
    "phoneOwner.mother": "Mother",
    "phoneOwner.father": "Father",
    "phoneOwner.grandmother": "Grandmother",
    "phoneOwner.grandfather": "Grandfather",
    "phoneOwner.guardian": "Guardian",
    "phoneOwner.aunt": "Aunt",
    "phoneOwner.uncle": "Uncle",
    "phoneOwner.sibling": "Sibling",
    "phoneOwner.other": "Other",
    "common.teacher": "Teacher",
    "common.resume": "Resume",
    "common.resumeHelp": "Upload a PDF resume for this teacher (max 10 MB).",
    "common.uploadResume": "Upload resume",
    "common.replaceResume": "Replace resume",
    "common.viewResume": "View PDF",
    "common.removeResume": "Remove resume",
    "common.noResumeYet": "No resume uploaded yet.",
    "common.room": "Room",
    "common.subject": "Subject",
    "common.instrument": "Instrument",
    "common.track": "Track",
    "common.type": "Type",
    "common.schedule": "Schedule",
    "common.duration": "Duration",
    "common.typicalDurationOptional": "Optional typical length",
    "common.durationMinutesPlaceholder": "e.g. 45",
    "common.lessonLengthHelp":
      "How long this class time is, in minutes. Type any whole number, such as 25, 40, or 90.",
    "common.typicalDurationHelp":
      "Typical length for this class, in minutes. Each scheduled lesson can be a different length — you do not need a separate class for each duration.",
    "common.student": "Student",
    "common.class": "Class",
    "common.date": "Date",
    "common.day": "Day",
    "common.time": "Time",
    "common.scheduleStudentOptional": "Student (optional)",
    "common.amount": "Amount",
    "common.category": "Category",
    "common.plan": "Plan",
    "trial.title": "【iSmartMusic·Trial class】",
    "trial.intro":
      "Please fill in the following information and send it to me, We will contact you:",
    "trial.childName": "Name",
    "trial.lastName": "Last name",
    "trial.dob": "DOB",
    "trial.gender": "Gender",
    "trial.genderMale": "Male",
    "trial.genderFemale": "Female",
    "trial.parentName": "Parent’s Name",
    "trial.phone": "Phone Number",
    "trial.address": "Address",
    "trial.subject": "Study Subjects",
    "trial.oneToOne": "1-to-1",
    "trial.groupClass": "Group class",
    "trial.haveStudied": "Have you Studied",
    "trial.haveStudiedPlaceholder": "e.g. played piano for 2 years, first lesson",
    "trial.suitableTime": "Suitable trial time",
    "trial.weekday": "Weekday",
    "trial.weekend": "Weekend",
    "trial.duration": "Trial time",
    "trial.durationUnit": "minutes",
    "trial.fee": "Trial Fee",
    "trial.feePromoHelp": "Choose $25 or $0 (current promotion).",
    "trial.feePromo": "promo",
    "trial.teacher": "Teacher",
    "trial.date": "Date",
    "trial.startTime": "Start time",
    "trial.submit": "Book trial class",
    "trial.booking": "Booking…",
    "trial.booked": "Trial class booked",
    "trial.bookedHelp":
      "Thank you. Front desk will call to confirm this trial lesson.",
    "trial.bookAnother": "Book another trial class",
    "trial.noTeachers":
      "No teachers are available for trial classes right now. Please contact the school to schedule.",
    "trial.close": "Close",
    "trial.bookButton": "Book trial class",
    "common.editPayment": "Edit payment",
    "common.editPaymentHelp":
      "Fix the student, class, amount, date, or notes if this payment was entered incorrectly.",
    "common.savePayment": "Save payment",
    "common.paidAt": "Paid at",
    "common.total": "Total",
    "common.remaining": "Remaining",
    "common.used": "Used",
    "common.absences": "Absences",
    "common.role": "Role",
    "common.campus": "Campus",
    "common.added": "Added",
    "common.processing": "Processing…",
    "common.continue": "Continue",
    "common.decline": "Decline",
    "common.noResults": "No results.",
    "common.noMatchSearch": "No results match your search.",
    "common.error.loadFailed": "Could not load {entity}: {message}",
    "common.empty.runSeed": "No {entity} yet. Run npm run seed to populate sample data.",
    "common.viewAll": "View all →",
    "common.fullSchedule": "Full schedule →",
    "common.new": "New",
    "common.today": "Today",
    "common.previous": "Previous",
    "common.next": "Next",
    "common.clear": "Clear",
    "common.all": "All",
    "common.of": "of",
    "common.hour": "1 hour",
    "common.hours": "{count} hours",
    "common.minutes": "{count} min",
    "common.noTeacherAssigned": "No teacher assigned",
    "common.addRoom": "Add room",
    "common.changeRoom": "Change room",
    "common.assignRoom": "Assign room",
    "common.noRoomAssigned": "No room assigned",
    "common.editTeachers": "Edit teachers",
    "common.editTeachersHelp":
      "Add or remove teachers for this class. Take out anyone who should not be listed here.",
    "common.saveTeachers": "Save teachers",
    "common.saveRoom": "Save room",
    "common.inSession": "In session",
    "common.noStudentsEnrolled": "No students enrolled",
    "common.trialLabel": "trial",
    "common.enrolled": "{count} enrolled",
    "common.viewClass": "View class →",
    "common.when": "When",
    "common.notes": "Notes",
    "common.note": "Note",
    "common.editNotes": "Edit notes",
    "common.studentNotesPlaceholder": "Write notes about this student…",
    "common.viewStudentNotes": "View student notes",
    "common.noStudentNotes": "No notes yet.",
    "common.receipts": "Receipts",
    "common.receiptsHelp":
      "Upload receipt photos for this student (JPEG, PNG, WebP, GIF, or HEIC · max 10 MB).",
    "common.receiptPhoto": "Receipt photo",
    "common.receiptNotePlaceholder": "e.g. March tuition payment",
    "common.saveReceipt": "Save receipt",
    "common.allReceipts": "All receipts",
    "common.noReceiptsYet": "No receipts uploaded yet.",
    "common.viewReceipt": "View",
    "common.optional": "(optional)",
    "common.description": "Description",
    "common.year": "Year",
    "common.month": "Month",
    "common.reason": "Reason",
    "common.editAmount": "Edit amount",
    "common.editPaymentAmount": "Edit payment amount",
    "common.editPurchaseAmount": "Edit purchase amount",
    "common.editPaycheckAmount": "Edit paycheck total",
    "common.editStatementAmount": "Edit statement amount",
    "common.editRecurringAmount": "Edit recurring amount",
    "common.editPricing": "Edit pricing",
    "common.changePricing": "Change price",
    "common.deletePricing": "Delete price",
    "common.deletePricingConfirm":
      "Clear this class’s custom prices? It will fall back to calculated rates.",
    "common.deletePricingFieldConfirm":
      "Clear {field}? It will fall back to the calculated rate.",
    "common.clearedClassPricing": "Cleared class pricing",
    "common.noLinkedClass": "No linked class",
    "common.editGrade": "Edit grade",
    "common.editGradeLevel": "Edit grade level",
    "common.editCredits": "Edit credits",
    "common.editClassCredits": "Edit class credits",
    "common.editClassCreditsHelp":
      "Type the counts you want to keep. Remaining is stored as entered, not calculated from total minus used.",
    "common.gradeLevel": "Grade level",
    "common.noGradeLevel": "No grade",
    "common.customGradeLevel": "Custom grade",
    "common.gradeLevelHelp":
      "Shown as Subject (G5). Choose a preset or enter a custom level.",
    "common.artMaterialFeeNote":
      "Material fee: +${pack20} (20-pack) / +${pack50} (50-pack)",
    "common.monthlyRateOnly": "Monthly rate (no lesson packs)",
    "common.specialPacks": "Special packs",
    "common.specialPacksSubtitle":
      "Limited-time promotional prices with a start and end date.",
    "common.addSpecialPack": "Add special pack",
    "common.noSpecialPacks": "No special packs yet.",
    "common.specialPackPriceHelp":
      "Leave unused price fields blank. At least one price is required.",
    "common.promoActiveNow": "Active now",
    "common.promoScheduled": "Scheduled",
    "common.promoBadge": "Promo: {name}",
    "common.dates": "Dates",
    "common.startDate": "Start date",
    "common.endDate": "End date",
    "common.originalAmount": "Original amount",
    "common.currentAmount": "Current amount",
    "common.newAmount": "New amount",
    "common.saveCorrection": "Save correction",
    "common.correctionReasonPlaceholder": "Why are you changing this amount?",
    "common.correctionKeepsHistory":
      "The original amount stays on record. This creates an adjustment on the statement.",
    "common.manualEntryCorrectionHelp":
      "Creates a reversal and a corrected replacement entry so the ledger stays auditable.",
    "common.recurringAmountEditHelp":
      "Updates the template for future months only. Past statement entries stay unchanged.",
    "common.fromCorrection": "Correction",
    "common.singleClassPrice": "Single class price",
    "common.package20Price": "20-class package price",
    "common.package50Price": "50-class package price",
    "common.updatedClassPricing": "Updated class pricing",
    "settings.trialPricing": "Trial class pricing",
    "settings.trialPricingDescription":
      "Set the trial fee and teacher pay for each campus. Changes apply to new trial bookings.",
    "settings.trialFee": "Trial fee",
    "settings.trialTeacherPay": "Trial teacher pay",
    "settings.editTrialPricing": "Edit trial pricing",
    "settings.updatedTrialPricing": "Updated campus trial pricing",
    "common.credits": "Credits",
    "common.noCreditsLeft": "No credits left",
    "common.notMarked": "Not marked",
    "common.makeUp": "Make-up",
    "common.creditUsed": "Credit used",
    "common.noDataYet": "No data yet.",
    "common.searchStudents": "Search students…",
    "common.searchStudentsByName": "Search students by name",
    "common.searchTutorsByName": "Search teachers by name",
    "common.searchClasses": "Search classes…",
    "common.searchStaff": "Search by name, email, or role",
    "common.searchTeachers": "Search or select a teacher",
    "common.searchSubjects": "Search or type a subject",
    "common.noSubjectsFound": "No matching subjects.",
    "common.useCustomSubject": "Use “{subject}”",
    "common.selectStudent": "Select a student",
    "common.selectTeacher": "Select a teacher",
    "common.selectClass": "Select a class",
    "common.selectSubject": "Select a subject",
    "common.selectType": "Select a type",
    "common.selectTime": "Select a time",
    "common.noClassTypesAvailable": "No class types for this subject.",
    "common.noClassTimesAvailable": "No class times for this subject and type.",
    "common.noScheduledTime": "No scheduled time",
    "common.noStudentsYet": "No students yet.",
    "common.noStudentsFound": "No students found.",
    "common.noTutorsYet": "No teachers yet.",
    "common.noTutorsFound": "No teachers found.",
    "common.noClassesYet": "No classes yet.",
    "common.noClassesFound": "No classes found.",
    "common.noClassesAvailable": "No classes available.",
    "common.noAccountsYet": "No staff accounts yet.",
    "common.noAccountsMatchSearch": "No accounts match your search.",
    "common.noActiveEntity": "No active {entity}.",
    "common.noInactiveEntity": "No inactive {entity}.",
    "common.countActiveEntity": "{count} active {entity}",
    "common.countActiveEntityPlural": "{count} active {entity}s",
    "common.countFilteredEntity": "{filtered} of {total} active {entity}s",
    "common.countInactiveEntity": "{count} inactive {entity}",
    "common.countInactiveEntityPlural": "{count} inactive {entity}s",
    "common.countFilteredInactiveEntity":
      "{filtered} of {total} inactive {entity}s",
    "common.noClassesInTrackNamed": "No {status} classes in {track}.",
    "common.oneStatusClassInTrack": "1 {status} class in {track}",
    "common.countStatusClassesInTrack": "{count} {status} classes in {track}",
    "common.filteredStatusClassesInTrack":
      "{filtered} of {total} {status} classes in {track}",
    "common.accountCount": "{count} account",
    "common.accountCountPlural": "{count} accounts",
    "common.countFilteredAccounts": "{filtered} of {total} accounts",
    "common.packageCountPack": "{count}-pack",
    "common.backToStudents": "← Back to students",
    "common.backToClasses": "← Back to classes",
    "common.backToTutors": "← Back to teachers",
    "common.backToTeacher": "← Back to teacher",
    "common.backToStudent": "← Back to student",
    "common.backToSchedule": "← Back to schedule",
    "common.backToLeads": "← Back to leads",
    "common.backToDashboard": "← Back to dashboard",
    "common.backToStatements": "← All statements",
    "common.redNamesNoCredits": "Red names have no class credits remaining",
    "common.lessonType": "Lesson type",
    "common.unassigned": "Unassigned",
    "common.activate": "Activate",
    "common.deactivate": "Deactivate",
    "common.cannotDeactivateSelf": "You cannot deactivate your own account.",
    "common.deleteAccount": "Delete",
    "common.deleteAccountConfirm":
      "This permanently deletes {email} and frees the email so you can create a new account with it.",
    "common.cannotDeleteSelf": "You cannot delete your own account.",
    "common.street": "Street",
    "common.city": "City",
    "common.state": "State",
    "common.zip": "ZIP",
    "common.address": "Address",
    "common.noAddresses": "No addresses on file.",
    "common.perClass": "Per class",
    "common.package20": "Package 20",
    "common.package50": "Package 50",
    "common.trial": "Trial (no packages)",
    "common.income": "Income",
    "common.expenses": "Expenses",
    "common.net": "Net",
    "common.fixedExpenses": "Fixed expenses",
    "common.variableExpenses": "Variable expenses",
    "common.noIncome": "No income recorded for this month yet.",
    "common.noExpenses": "No expenses recorded for this month yet.",
    "common.noFixedExpenses": "No fixed expenses this month. Recurring items like rent appear here.",
    "common.noVariableExpenses": "No variable expenses this month. Teacher paychecks and one-off costs appear here.",
    "common.fromPayment": "From payment",
    "common.fromPurchase": "From purchase",
    "common.fromPaycheck": "Teacher paycheck",
    "common.fromFrontDeskPay": "Front desk pay",
    "common.fromRecurring": "Recurring",
    "common.addIncome": "Add income",
    "common.addExpense": "Add expense",
    "common.saveEntry": "Save entry",
    "common.addEntry": "Add entry",
    "common.recurringEntries": "Recurring entries",
    "common.deleteRecurringEntry": "Delete recurring entry",
    "common.deleteStatementEntryConfirm":
      "This will permanently remove this statement entry.",
    "common.deleteTeacherPaycheckStatementConfirm":
      "This will remove the teacher paycheck from the statement and clear their per-class pay rates so you can re-enter them.",
    "common.deleteFrontDeskPayStatementConfirm":
      "This will remove the front desk pay from the statement so hours can be submitted again.",
    "common.deleteRecurringStatementInstanceConfirm":
      "This will remove this month’s recurring entry. The recurring template will stay active.",
    "common.dayOfMonth": "Day of month",
    "common.totalIncome": "Total income",
    "common.mark": "Mark",
    "common.go": "Go",
    "common.pickDate": "Pick a date…",
    "common.markAllPresent": "Mark all present ({count})",
    "common.markedPresent": "Marked {marked} present ({skipped} already marked)",
    "common.noEnrolledStudents": "No enrolled students",
    "common.selectStudentAbove": "Select a student above to mark attendance.",
    "common.noClassesScheduled": "{name} has no classes scheduled on this date.",
    "common.allTeachers": "All teachers",
    "common.previousWeek": "Previous week",
    "common.nextWeek": "Next week",
    "common.previousDay": "Previous day",
    "common.nextDay": "Next day",
    "common.weekView": "Week",
    "common.dayView": "Day",
    "common.teacherDayList": "Teacher day list",
    "common.teacherDayListHelp":
      "Pick a teacher and date to see every class and student that day.",
    "common.addStudentToSchedule": "Add student",
    "common.addStudentToScheduleHelp":
      "Choose a student, then pick the instrument and how long this class time is.",
    "common.addGroupClassToSchedule": "Add group class",
    "common.addGroupClassToScheduleHelp":
      "Choose students, then pick the instrument and how long this class time is.",
    "common.selectTeacherToAddStudent":
      "Select a teacher, then choose an existing student or add a new one.",
    "common.teacherStudents": "This teacher's students",
    "common.searchTeacherStudents": "Search this teacher's students, or type to find anyone",
    "common.students": "Students",
    "common.selectAtLeastOneStudent": "Select at least one student.",
    "common.createNewClass": "Create a new class…",
    "common.addToSchedule": "Add to schedule",
    "common.clickEmptySlotToAdd":
      "Select a teacher and click an empty time to add a private or group class.",
    "common.downloadPdf": "PDF",
    "common.pdfPrintHint":
      "In the print dialog, choose “Save as PDF” to download a copy.",
    "common.pdfPopupBlocked":
      "Unable to open the PDF window. Allow pop-ups for this site and try again.",
    "common.frontDeskTimesheet": "Front desk timesheet",
    "common.noHoursLoggedThisMonth": "No hours logged for this month.",
    "common.paycheckReceivedAck":
      "I confirm that I have received this paycheck.",
    "common.signature": "Signature",
    "common.hideTeacherFilters": "Hide teachers",
    "common.showTeacherFilters": "Show teachers",
    "common.clearFilter": "Clear filter",
    "common.showingClassesFor": "Showing classes for {name}",
    "common.noScheduledClasses": "No scheduled classes found.",
    "common.noScheduleYet": "No classes have a schedule yet.",
    "common.reschedule": "Reschedule",
    "common.rescheduledThisWeek": "Rescheduled for this week",
    "common.repeatsWeekly": "Repeats weekly",
    "common.saveChanges": "Save changes",
    "common.addTime": "Add time",
    "common.addMeetingTime": "Add meeting time",
    "common.editMeetingTime": "Edit meeting time",
    "common.copy": "Copy",
    "common.copyMeetingTime": "Copy meeting time",
    "common.copyClass": "Copy class",
    "common.copyClassHelp":
      "Creates another meeting time for the same class. Change the day or time, then save.",
    "common.changeTime": "Change time",
    "common.removeMeetingTime": "Remove meeting time?",
    "common.removeMeetingTimeConfirm": "This will remove the meeting time from the class schedule.",
    "common.recordPayment": "Record payment",
    "common.recordPurchase": "Record purchase",
    "common.noPaymentsYet": "No payments yet.",
    "common.noPurchasesYet": "No purchases yet.",
    "common.confirmPayment": "Confirm payment",
    "common.confirmPurchase": "Confirm purchase",
    "common.paymentRecorded": "Payment recorded — {student} paid for {count} class(es) ({subject})",
    "common.purchaseRecorded": "Purchase recorded for {student}.",
    "common.refundCredits": "Refund credits",
    "common.exchangeCredits": "Exchange credits",
    "common.transferTo": "Transfer to",
    "common.allCreditsFromPayment": "All {count} credits from this payment",
    "common.howManyClasses": "How many classes?",
    "common.selectStudentFirst": "Select a student first.",
    "common.selectTeacherFirst": "Select a teacher first.",
    "common.selectClassFirst": "Select a class first.",
    "common.selectSubjectFirst": "Select a subject first.",
    "common.selectTypeFirst": "Select a type first.",
    "common.selectTimeFirst": "Select a time first.",
    "common.createEvent": "Create event",
    "common.postEvent": "Post",
    "common.posting": "Posting…",
    "common.deletePost": "Delete this post?",
    "common.deletePostConfirm": "This will permanently delete the post and all attached media.",
    "common.noEventsYet": "No events posted yet.",
    "common.createFirstEvent": "Create your first event post.",
    "common.shareFirstUpdate": "Share the first update",
    "common.newPostsInDays": "{count} new post(s) in the last {days} days",
    "common.latestNews": "Latest school news and highlights",
    "common.photosVideos": "{count} photo(s)/video(s)",
    "common.changePassword": "Change password",
    "common.currentPassword": "Current password",
    "common.newPassword": "New password",
    "common.confirmPassword": "Confirm new password",
    "common.updatePassword": "Update password",
    "common.passwordUpdated": "Password updated successfully.",
    "common.setPassword": "Set password",
    "common.setManagerPasswordHelp": "Set a new password for {name}.",
    "common.setManagerPasswordHint":
      "To reset a manager or teacher login, open their campus tab and click Set password under their name.",
    "common.addStaffAccount": "Add staff account",
    "common.addManager": "Add manager",
    "common.addTeacherAccount": "Add teacher",
    "common.addTeacherAccountHelp":
      "Creates an app login for a teacher (separate from campus managers). You can link an existing teacher profile or create a new one.",
    "common.linkTeacherProfile": "Teacher profile",
    "common.createNewTeacherProfile": "Create new teacher profile",
    "common.noTeacherProfiles":
      "No unlinked teacher profiles for this campus. Create a new one with this account.",
    "common.addStatenIslandManager": "Add Staten Island manager",
    "chat.title": "Teacher chat",
    "chat.subtitle":
      "Review conversations between teachers and students. Pick a teacher, then a student thread.",
    "chat.pickTeacher": "Teachers",
    "chat.pickConversation": "Conversations",
    "chat.noTeachers": "No teachers with app logins yet. Add them in Settings → Teachers.",
    "chat.noConversations": "This teacher has no student conversations yet.",
    "chat.noMessages": "No messages in this conversation yet.",
    "chat.selectTeacherHint": "Select a teacher to see their student chats.",
    "chat.selectConversationHint": "Select a conversation to read messages.",
    "chat.fromTeacher": "Teacher",
    "chat.fromStudent": "Student",
    "chat.messageCount": "{count} messages",
    "chat.conversationCount": "{count} conversations",
    "chat.lastActive": "Last active {when}",
    "common.createAccount": "Create account",
    "common.creating": "Creating…",
    "common.enrolling": "Enrolling…",
    "common.adding": "Adding…",
    "common.recording": "Recording…",
    "common.deducting": "Deducting…",
    "common.marking": "Marking…",
    "common.grant": "Grant",
    "common.refund": "Refund",
    "common.writeOff": "Write off",
    "common.makeUpCredit": "Make-up",
    "common.creditsToAdd": "Credits to add",
    "common.sessionDate": "Session date",
    "common.creditCost": "Credit cost (1 or 2)",
    "common.allCredits": "All {count} credits",
    "common.deductClass": "Deduct 1 class",
    "common.markAbsent": "Mark absent",
    "common.classDeducted": "Class deducted.",
    "common.markedAbsent": "Marked absent.",
    "common.paycheck": "Paycheck",
    "common.ratePerClass": "Rate/class",
    "common.totalPaycheck": "Total paycheck",
    "common.reviewPaycheck": "Review & record paycheck",
    "common.confirmPaycheck": "Confirm paycheck",
    "common.noPaycheckPeriods": "No paycheck periods recorded yet.",
    "common.viewInStatements": "View in statements →",
    "common.recorded": "Recorded ·",
    "common.addNewStudent": "Add new student",
    "common.addNewStudents": "Add new students",
    "common.addNewTutor": "Add new teacher",
    "common.addNewClass": "Add new class",
    "common.addCourse": "Add course",
    "common.addCourseHelp":
      "Create a course with its name, duration, type, and prices.",
    "common.courseName": "Course name",
    "common.courseNamePlaceholder": "e.g. Guitar",
    "common.renameCourse": "Rename course",
    "common.deleteCourse": "Delete course",
    "common.deleteCourseConfirm":
      "This permanently deletes this tuition course, including its schedules, enrollments, credits, and payments for this course only. Student records are not deleted.",
    "common.saveStudent": "Save student",
    "common.saveTutor": "Save teacher",
    "common.saveClass": "Save class",
    "common.saveClasses": "Save classes",
    "common.saveAddress": "Save address",
    "common.addToClass": "Add to class",
    "common.addToClasses": "Add to classes",
    "common.addStudents": "Add students",
    "common.enrollStudent": "Enroll student",
    "common.removeFromClass": "Remove from class",
    "common.removeClass": "Remove class?",
    "common.deleteStudent": "Delete student",
    "common.deleteStudentConfirm": "This will permanently delete {name} and all related records.",
    "common.deleteTeacher": "Delete teacher",
    "common.deleteTeacherConfirm":
      "This will permanently delete {name}, their class assignments, hour logs, and paycheck records.",
    "common.deleteClass": "Delete class",
    "common.deleteClassConfirm":
      "This will permanently delete this class, including its schedules, enrollments, credits, and payments for this class only. Student records are not deleted.",
    "common.deleteTrialConfirm":
      "This will permanently delete this trial lesson, including its schedule, enrollment, credits, and trial payment.",
    "common.deleteAddress": "Delete address",
    "common.deleteAddressConfirm": "This will permanently delete this address.",
    "common.editDateOfBirth": "Edit date of birth",
    "common.editClass": "Edit class",
    "common.editTutor": "Edit teacher",
    "common.editStudent": "Edit student",
    "common.editPageHelp":
      "Change any field below, then save. Cancel discards unsaved changes.",
    "common.editAddress": "Edit address",
    "common.addAddress": "Add address",
    "common.assignClasses": "Assign classes",
    "common.createClassForTeacherHelp":
      "Create a class for this teacher by instrument. Lesson length is chosen when you add a time to the schedule.",
    "common.firstName": "First name",
    "common.lastName": "Last name",
    "common.startingClassSessions": "Starting class sessions",
    "common.startingClassSessionsHelp": "Optional prepaid sessions when enrolling in classes.",
    "common.street1": "Street address 1",
    "common.street2": "Street address 2",
    "common.selectState": "Select state",
    "common.classCredits": "Class credits",
    "common.classHistory": "Class history",
    "common.classHistoryHelp": "Sessions attended, absences, and credit usage over time.",
    "common.allTimeByClass": "All-time by class",
    "common.notEnrolled": "Not enrolled in any classes.",
    "common.totalClassesTaken": "Total classes taken",
    "common.studentId": "Student ID",
    "common.tutorId": "Teacher ID",
    "common.classId": "Class ID",
    "common.classes": "Classes",
    "common.enrollToTrack": "Enroll this student in classes to track prepaid sessions.",
    "common.classCreditsTitle": "Class credits — {subject}",
    "common.attendanceHistory": "Attendance history",
    "common.previousMonth": "Previous month",
    "common.nextMonth": "Next month",
    "common.selectHighlightedDate": "Select a highlighted date to view sessions.",
    "common.noSessionsOnDate": "No sessions on this date.",
    "common.sessionsOnDate": "Sessions on {date}",
    "common.purchases": "Purchases",
    "common.deleteClassSchedule": "Delete",
    "common.scheduleHelp":
      "Pair each meeting time with a student when possible. Set how long that class time is in minutes.",
    "common.noMeetingTimes": "No meeting times set yet.",
    "common.activeEnrollment": "Active enrollment",
    "common.inactiveEnrollment": "Inactive enrollment",
    "common.toggleActiveStatus": "Toggle active status for {name}",
    "common.quickLinks": "Quick links",
    "common.todaysOverview": "What's happening today, and shortcuts to your main lists.",
    "common.happeningNow": "Happening now",
    "common.classesInSession": "Classes in session at the moment",
    "common.noClassesMeetingNow": "No classes are meeting right now.",
    "common.comingUpToday": "Coming up today",
    "common.classesStillScheduled": "Classes still on the calendar today",
    "common.noMoreClassesToday": "No more classes scheduled for today.",
    "common.lowCreditsTitle": "Low class credits",
    "common.lowCreditsSubtitle": "Students with 0 or 1 credit left across their classes",
    "common.lowCreditsEmpty": "No students are down to 0 or 1 credit.",
    "common.creditsRemainingCount": "{count} left",
    "common.allTracks": "All tracks",
    "common.classTracks": "Class tracks",
    "common.noClassesInTrack": "No {status} classes in this track.",
    "common.tuitionsSubtitle": "Official price sheet: per-class rates, prepaid packages, and dated special packs.",
    "sheet.officialTitle": "iSmart Music Center — unit price list",
    "sheet.officialSubtitle":
      "Prices follow the official chart. Piano and Violin 1V1 use duration and grade level to show the matching rate.",
    "sheet.piano1v1": "Piano 1V1",
    "sheet.violin1v1": "Violin 1V1",
    "sheet.level1v1Hint":
      "Choose duration and grade tier (G0–G2 → Levels 0–2, etc.) to see single, 20-pack, and 50-pack prices.",
    "sheet.otherInstrument1v1": "Guitar / Drum / Vocal / Guzheng / Cello 1V1",
    "sheet.choirOrchestraTheory": "Choir / Orchestra / Music Theory — 60 min",
    "sheet.talentExam": "Talent Examination Preparation Class — 60 min",
    "sheet.specialtyGroup": "Sing & Play / Model / Catwalk (group) — 60 min",
    "sheet.art": "Art (group)",
    "sheet.dance": "Dance / Jazz / Chinese Dance / Hip Hop",
    "sheet.band": "Band group lessons — 60 min",
    "sheet.art1v1": "1-to-1 Art Lessons",
    "sheet.grade.g0_2": "Levels 0–2",
    "sheet.grade.g3_4": "Levels 3–4",
    "sheet.grade.g5_6": "Levels 5–6",
    "sheet.grade.g7_8": "Levels 7–8",
    "sheet.grade.performance": "Performance",
    "sheet.perMonth": "/ month",
    "sheet.materialFeeAdd": "+${amount} materials",
    "sheet.danceBagAdd": "+${amount} dance equipment bag",
    "sheet.bandMonthlyNote": "$160/month (4 lessons); no 20/50 packs.",
    "sheet.otherClasses": "Other classes",
    "sheet.otherClassesSubtitle":
      "Classes not listed on the official sheet. Pricing here still drives payments and edits.",
    "common.paymentsSubtitle": "Record class payments. Completed payments appear in Statements automatically.",
    "common.purchasesSubtitle": "Books, materials, and other student purchases.",
    "common.statementsSubtitle": "Monthly income and expense summaries.",
    "common.attendanceSubtitle": "Mark daily attendance for enrolled students. Present and absent use 1 credit; excused does not.",
    "common.scheduleSubtitle":
      "Select a teacher, then click an empty time to add a student. Drag to change the time. Hold Option (Alt) and drag to copy.",
    "common.eventsSubtitle": "Share school news, photos, and video highlights.",
    "common.attendanceFooter": "A scheduled makeup waits to use the credit until that makeup class has passed.",
    "common.rescheduleThisOccurrence": "This occurrence only",
    "common.rescheduleAllFuture": "All future occurrences",
    "common.deleteFromCalendar": "Delete from calendar",
    "common.deleteThisOccurrence": "This occurrence only",
    "common.deleteAllOccurrences": "Entire schedule",
    "common.deleteScheduleEventConfirm":
      "Remove this class time from the calendar?",
    "common.deleteTrialFromCalendarConfirm":
      "This will permanently delete this trial class, including its payment and enrollment.",
    "common.deleteAllOccurrencesConfirm":
      "This will permanently remove the entire recurring schedule.",
    "common.originalTime": "Original time",
    "common.newTime": "New time",
    "common.originalDuration": "Original duration",
    "common.newDuration": "New duration",
    "common.changeDuration": "Change duration",
    "common.updateClassTime": "Update class time",
    "common.searchClassesPrices": "Search classes, teachers, or prices…",
    "common.packageOff": "{count}-class package, {rate}% off — private & group only",
    "common.trialNoPackages": "Trial (no packages)",
    "common.classCount": "{count} class",
    "common.classCountPlural": "{count} classes",
    "common.studentsMarked": "{students} student(s) · {marked} marked",
    "common.studentCount": "{count} student",
    "common.studentCountPlural": "{count} students",
    "common.alreadyMarked": "already marked",
    "common.areYouSure": "Are you sure?",
    "common.confirmPaycheckTitle": "Confirm paycheck",
    "common.confirmPaycheckHelp": "This will record the paycheck and add it to the monthly statement.",
    "common.confirmAndRecordPaycheck": "Confirm & record paycheck",
    "common.reviewFrontDeskPay": "Confirm & submit to statements",
    "common.confirmFrontDeskPayTitle": "Submit hours to statements",
    "common.confirmFrontDeskPayHelp":
      "This will add this month’s front desk hours and pay as an expense on the statements page.",
    "common.confirmAndSubmitFrontDeskPay": "Confirm & submit",
    "common.frontDeskPayAlreadyRecorded": "Already submitted to statements for this month.",
    "common.noFrontDeskHoursToSubmit": "Log hours for this month before submitting.",
    "common.noPostsYet": "No posts yet.",
    "common.photos": "photo",
    "common.videos": "video",
    "common.mediaCount": "{count} {type}(s)",
    "common.previousMedia": "Previous media",
    "common.nextMedia": "Next media",
    "common.weekly": "Weekly",
    "common.oneTime": "One-time",
    "common.startTime": "Start time",
    "common.endTime": "End time",
    "common.am": "AM",
    "common.pm": "PM",
    "common.hourInput": "Hour",
    "common.minuteInput": "Minute",
    "common.amPm": "AM or PM",
    "common.noLocation": "No location",
    "common.location": "Location",
    "common.noStaffAccounts": "No staff accounts yet.",
    "common.couldNotLoadStaff": "Could not load staff accounts: {message}",
    "common.creditsButton": "Credits",
    "common.exchange": "Exchange",
    "common.writeOffAction": "Write off",
    "common.refundAction": "Refund",
    "common.grantAction": "Grant",
    "common.makeUpAction": "Make-up",
    "common.searchClassesFull": "Search classes by subject, track, teacher, room, or type",
    "common.searchAndSelectClasses": "Search and select classes",
    "common.searchAndSelectStudents": "Search and select students",
    "common.searchAndSelectTeachers": "Search and select teachers",
    "common.assignMultipleTeachersHelp":
      "You can assign more than one teacher to this class. The first selected teacher is the primary teacher.",
    "common.addNewTutorInline": "Add new teacher",
    "common.noTutorsAddFirst": "No teachers yet. Add one first.",
    "common.noRoomsAvailable": "No rooms available.",
    "common.placeholderSubject": "e.g. Piano, Voice, Ballet",
    "common.placeholderDescription": "Description",
    "common.placeholderPurchase": "e.g. Piano book, metronome, recital fee",
    "common.placeholderEventTitle": "Title (optional)",
    "common.placeholderEventBody": "What's happening at the school?",
    "common.purchaseDescription": "Description",
    "common.confirmPurchaseTitle": "Confirm purchase",
    "common.confirmPaymentTitle": "Are you sure?",
    "common.paymentPlanHelp": "Select a payment plan for this class.",
    "common.singleClassLabel": "Single class",
    "common.activeEnrolled": "active · {count} enrolled",
    "common.activeEnrolledSummary": "{active} active · {enrolled} enrolled",
    "common.studentsEnrolled": "Students enrolled",
    "common.noStudentsEnrolledInClass": "No students enrolled in this class.",
    "common.classPayments": "Class payments",
    "common.studentPurchases": "Student purchases",
    "common.teacherPaycheck": "Teacher paycheck",
    "common.statementMonthIncome": "Income and expenses for {month}.",
    "common.statementMonthExpense": "Expense breakdown for {month}.",
    "common.allExpenses": "All expenses",
    "common.fixedExpensesTab": "Fixed expenses",
    "common.variableExpensesTab": "Variable expenses",
    "common.recurringExpense": "Recurring expense",
    "common.addRecurringEntry": "Add recurring entry",
    "common.noRecurringEntries": "No recurring entries yet.",
    "common.recurringEntriesHelp": "Recurring entries are automatically added to each month's statement.",
    "common.statementEntries": "Statement entries",
    "common.noStatementsYet": "No statements yet. Record income or expenses to get started.",
    "common.statementsListHelp": "Monthly income and expense summaries.",
    "common.auth.signIn": "Sign in",
    "common.auth.signingIn": "Signing in…",
    "common.auth.signInTitle": "Sign in to your account",
    "common.auth.emailAddress": "Email address",
    "common.auth.password": "Password",
    "common.auth.needAccount": "Need an account? Ask an admin to create one in Settings.",
    "common.auth.brooklynAdmin": "Brooklyn, NY · Admin",
    "common.auth.signInDescription": "Sign in to the iSmart Music School admin console.",
    "enum.classTrack.instrumental": "Instrumental",
    "enum.classTrack.vocal": "Vocal",
    "enum.classTrack.composition": "Composition",
    "enum.classTrack.dance": "Dance",
    "enum.classTrack.music_education": "Music education",
    "enum.classTrack.other": "Other",
    "enum.lessonType.private": "Private lesson",
    "enum.lessonType.group": "Group lesson",
    "enum.lessonType.trial": "Trial lesson",
    "enum.paymentClassType.trial": "Trial",
    "enum.paymentClassType.private": "One-to-one",
    "enum.paymentClassType.group": "Group class",
    "enum.paymentStatus.completed": "Completed",
    "enum.paymentStatus.refunded": "Refunded",
    "enum.paymentStatus.exchanged": "Exchanged",
    "enum.paymentPlan.single": "Single class",
    "enum.paymentPlan.package": "{count}-class package",
    "enum.attendance.present": "Present",
    "enum.attendance.late": "Late",
    "enum.attendance.absent": "Absent",
    "enum.attendance.excused": "Excused absent",
    "enum.attendanceDescription.present": "Attended — 1 credit used",
    "enum.attendanceDescription.late": "Arrived late — 1 credit used",
    "enum.attendanceDescription.absent": "Did not attend — 1 credit used",
    "enum.attendanceDescription.excused": "Excused absence — no credit used",
    "enum.staffRole.admin": "Admin",
    "enum.staffRole.manager": "Manager",
    "enum.staffRole.teacher": "Teacher",
    "enum.staffRole.frontDesk": "Front desk",
    "enum.staffLocation.brooklyn": "Brooklyn",
    "enum.staffLocation.staten_island": "Staten Island",
    "enum.staffLocation.brooklynLabel": "Brooklyn, NY",
    "enum.staffLocation.statenIslandLabel": "Staten Island, NY",
    "enum.leadStatus.new": "New",
    "enum.leadStatus.contacted": "Contacted",
    "enum.leadStatus.enrolled": "Enrolled",
    "enum.leadStatus.closed": "Closed",
    "leads.subtitle":
      "Track inquiries and trial students — contact info, description, and follow-up.",
    "leads.empty": "No leads yet. Add an inquiry or book a trial class.",
    "leads.addLead": "Add lead",
    "leads.addLeadDescription":
      "Record the student’s name, contact details, address, and a short description.",
    "leads.editLead": "Edit lead",
    "leads.deleteLead": "Delete lead",
    "leads.deleteLeadConfirm":
      "Delete lead for {name}? This cannot be undone.",
    "leads.parentInfo": "Student",
    "leads.parentFirstName": "First name",
    "leads.parentLastName": "Last name",
    "leads.studentInfo": "Student",
    "leads.studentFirstName": "First name",
    "leads.studentLastName": "Last name",
    "leads.studentFirstNameRequired": "Student first name is required.",
    "leads.address": "Address",
    "leads.contact": "Contact",
    "leads.needsFutureContact": "Needs future contact",
    "leads.noFutureContactNeeded": "No follow-up needed",
    "leads.description": "Description",
    "leads.descriptionPlaceholder":
      "What they asked about, instruments of interest, notes from the call, etc.",
    "leads.noDescription": "No description recorded.",
    "leads.children": "Children",
    "leads.noChildren": "No children added yet.",
    "leads.addChild": "Add child",
    "leads.editChild": "Edit child",
    "leads.deleteChildConfirm": "Remove {name} from this lead?",
    "leads.childLastName": "Last name",
    "leads.background": "Background",
    "leads.backgroundPlaceholder":
      "Age, grade, interests, learning needs, etc.",
    "leads.experience": "Experience",
    "leads.experiencePlaceholder":
      "Prior music lessons, instruments played, competitions, etc.",
    "leads.searchPlaceholder": "Search by name, phone, email, or description",
    "leads.countShown": "Showing {filtered} of {total} leads",
    "leads.summaryTabs": "Lead summaries",
    "leads.tabAll": "All",
    "leads.tabThisMonth": "This month",
    "leads.tabInquiries": "Inquiries",
    "leads.tabTrials": "Trials",
    "leads.type": "Type",
    "leads.typeInquiry": "Inquiry",
    "leads.typeTrial": "Trial",
    "leads.emptyThisMonth": "No leads or trials this month yet.",
    "leads.emptyInquiries": "No inquiry leads yet.",
    "leads.emptyTrials": "No trial students yet.",
    "leads.makeOfficial": "Make official student",
    "leads.makeOfficialDescription":
      "Create an official student from {name} so you can enroll them in regular classes.",
    "leads.makeOfficialHelp":
      "Official students can be enrolled in multiple classes.",
    "leads.makeTrialOfficialDescription":
      "Promote {name} from a single trial class so you can enroll them in regular classes.",
    "leads.makeTrialOfficialHelp":
      "Sets starting class sessions, then opens the student profile so you can add classes.",
    "leads.addNewStudent": "Add a new student…",
    "leads.trialOneClassOnly": "Trial class only",
    "leads.viewLead": "View lead",
    "leads.monthSummaryTitle": "{month} summary",
    "leads.monthSummarySubtitle":
      "{total} total · {inquiries} inquiries · {trials} trials",
    "leads.createdAt": "Created {date}",
    "leads.updatedAt": "Updated {date}",
    "leads.convertToStudent": "Convert to student",
    "leads.convertToStudentDescription":
      "Create an official student record for {name}. Name, date of birth, background, and experience will be copied over.",
    "leads.convertAllToStudents": "Convert all ({count})",
    "leads.convertAllDescription":
      "Create official student records for all {count} children on this lead.",
    "leads.startingClassSessions": "Starting class sessions",
    "leads.convertAddressNote":
      "The lead address will be copied to each new student when available.",
    "leads.viewStudent": "View student",
    "leads.notYetStudent": "Lead only",
    "leads.parentFirstNameRequired": "Parent first name is required.",
    "leads.phoneRequired": "Phone number is required.",
    "enum.month.january": "January",
    "enum.month.february": "February",
    "enum.month.march": "March",
    "enum.month.april": "April",
    "enum.month.may": "May",
    "enum.month.june": "June",
    "enum.month.july": "July",
    "enum.month.august": "August",
    "enum.month.september": "September",
    "enum.month.october": "October",
    "enum.month.november": "November",
    "enum.month.december": "December",
    "format.statementMonth": "{month} {year}",
    "enum.statementEntryType.income": "Income",
    "enum.statementEntryType.expense": "Expense",
    "enum.statementExpenseCategory.fixed": "Fixed",
    "enum.statementExpenseCategory.variable": "Variable",
    "enum.weekday.sunday": "Sunday",
    "enum.weekday.monday": "Monday",
    "enum.weekday.tuesday": "Tuesday",
    "enum.weekday.wednesday": "Wednesday",
    "enum.weekday.thursday": "Thursday",
    "enum.weekday.friday": "Friday",
    "enum.weekday.saturday": "Saturday",
    "enum.schedule.repeatsWeekly": " (Repeats weekly)",
    "enum.schedule.oneTime": " (One-time)",
    "enum.schedule.unknownDay": "Unknown day",
    "time.justNow": "Just now",
    "time.minutesAgo": "{count}m ago",
    "time.hoursAgo": "{count}h ago",
    "time.daysAgo": "{count}d ago",
    "common.attendancePickDateHelp":
      "Pick a date, then choose all teachers with class today or one teacher.",
    "common.classesOnDate": "Classes on {date}",
    "common.attendanceAllClassesHelp":
      "Students are grouped by teacher. Two teachers appear in each row.",
    "common.noClassesOnDate": "No classes scheduled for this date.",
    "common.viewStudentClassesOnly":
      "Select a student above to view their classes only.",
    "common.classCountOnDate": "{count} classes on {date}",
    "common.makeupLesson": "makeup lesson",
    "common.makeUpClass": "Make up class",
    "common.teachersToday": "Teachers with class today",
    "common.allTeachersToday": "All teachers with class today",
    "common.totalClass": "Total class",
    "common.remainingClass": "Remaining class",
    "common.makeupDate": "Makeup date",
    "common.makeupTime": "Makeup time",
    "common.saveMakeup": "Save makeup",
    "common.makeupDialogHelp":
      "Reschedule this student with the same teacher. The class credit is used after the makeup time has passed.",
    "common.makeupScheduled": "Makeup {date} · {time}",
    "common.rescheduleMakeup": "Reschedule makeup",
    "common.noTeachersToday": "No teachers have class on this date.",
    "common.notScheduled": "Not scheduled",
    "common.paymentOptionUnavailable":
      "This payment option is not available for this class.",
    "common.noActiveClassesFor": "No active classes for {name}.",
    "common.recordPaymentDialogHelp":
      "Choose the student, teacher, subject, type, time, and how many classes they are paying for. Income is added to Statements automatically.",
    "common.confirmPaymentBeforeRecord":
      "Confirm this payment before it is recorded.",
    "common.paidFor": "paid for",
    "common.addedToStatementsIncome":
      "This will be added to this month's income on Statements.",
    "common.sessionCount": "{count} session",
    "common.sessionCountPlural": "{count} sessions",
    "common.purchaseRecordedDetail":
      "Purchase recorded — {student} paid {amount} for {description}.",
    "common.describePurchase": "Describe what they are paying for.",
    "common.enterValidAmount": "Enter a valid amount greater than zero.",
    "common.purchasesEmptyHelp":
      "Record books, materials, and other items a student pays for.",
    "common.payingFor": "is paying for",
    "common.confirmPurchaseBeforeRecord":
      "Confirm this purchase before it is recorded.",
    "common.purchaseDialogHelp":
      "Books, materials, and other items. Income is added to this month's statement automatically.",
    "common.whatPayingFor": "What they are paying for",
    "common.item": "Item",
    "common.assignClassesForPaycheck":
      "Assign classes to this teacher before calculating a paycheck.",
    "common.classesThisPeriod": "{count} classes this period",
    "common.recordedAt": "Recorded {date}",
    "common.recordedAsExpenseFor": "Recorded as an expense for {month}.",
    "common.paycheckRatesHelp":
      "Sessions are grouped by subject and grade level (e.g. Violin Levels 0–2). Counts use sessions marked used or absent. Rates are saved per subject+level and carry over until you change them.",
    "common.subtotal": "Subtotal",
    "common.confirmPaycheckReview":
      "Review the full class list for {month} before recording this expense.",
    "common.paycheckExpenseWillRecord":
      "{count} classes will be recorded as an expense on the {month} statement.",
    "common.statementsAutoMonths":
      "No statements yet. Months appear automatically when payments are recorded.",
    "common.teachers": "Teachers",
    "common.subjectClassCount": "{count} classes",
    "common.showSubjectClasses": "Show classes for {subject}",
    "common.hideSubjectClasses": "Hide classes for {subject}",
    "common.teacherCount": "{count} teachers",
    "common.durationsAvailable": "Durations",
    "common.selectTeacherForSubject":
      "Select a teacher for this subject",
    "common.teacherFilterHelp":
      "Select one or more teachers. Leave all unchecked to show everyone.",
    "common.clearStudentFilter": "Clear student filter",
    "common.noScheduleAddOnClass":
      "No classes have a schedule yet. Add times on a class detail page.",
    "common.showingClassesNoneFound": " — no scheduled classes found.",
    "common.daysWithClassHistory":
      "{count} days with class history. Select a highlighted date.",
    "common.noClassHistory": "No class history recorded yet.",
    "common.autoRecorded": "Auto-recorded",
    "common.creditsUsedCount": "{count} credits used",
    "common.classHistoryOnDay": "{count} classes on this day.",
    "common.selectDateForHistory":
      "Select a highlighted date on the calendar to view class history.",
    "common.showingStaffFor": "Showing staff for {location} iSmart.",
    "common.statenIslandManagerHelp":
      "Admins can create manager accounts for Staten Island from this tab.",
    "common.classTrackLabel": "Class track",
    "common.noMeetingTimesAdd":
      "No meeting times yet. Add a weekly or one-time slot.",
    "common.rate": "Rate",
    "common.classesColumn": "Classes",
    "common.showMedia": "Show media {index}",
    "common.enterPayRateForClass": "Enter a pay rate for at least one class.",
    "enum.classTrack.instrumentalDesc":
      "Piano, strings, winds, drums, and other instruments",
    "enum.classTrack.vocalDesc": "Voice, choir, and singing lessons",
    "enum.classTrack.compositionDesc": "Songwriting and original music creation",
    "enum.classTrack.danceDesc": "Ballet, hip hop, tap, and movement classes",
    "enum.classTrack.music_educationDesc":
      "Music theory, musical theater, and ensemble skills",
    "enum.classTrack.otherDesc": "Classes that do not fit the tracks above",
  },
  zh: {
    "nav.dashboard": "首页",
    "nav.students": "学生",
    "nav.leads": "潜在客户",
    "nav.classes": "课程",
    "nav.tutors": "老师",
    "nav.tuitions": "学费",
    "nav.payments": "付款",
    "nav.purchases": "书籍与购买",
    "payments.subtitle":
      "记录课程付款以及书籍或材料购买。已完成的金额会自动出现在财务报表中。",
    "payments.tabsAria": "付款分区",
    "payments.tabPayments": "课程付款",
    "payments.tabPurchases": "书籍与购买",
    "nav.statements": "财务报表",
    "nav.attendance": "考勤",
    "nav.schedule": "日程",
    "nav.events": "活动",
    "nav.settings": "设置",
    "nav.myHours": "我的工时",
    "nav.chat": "聊天",
    "brand.musicSchool": "音乐学校",
    "settings.title": "设置",
    "settings.subtitleAdmin": "管理员工、校区经理以及老师 App 登录（布鲁克林与史泰登岛）。",
    "settings.subtitleSelf": "管理您的账户设置。",
    "settings.yourAccount": "您的账户",
    "settings.signedInAs": "当前登录",
    "settings.tabsAria": "设置分区",
    "settings.tabGeneral": "常规",
    "settings.tabStaff": "员工",
    "settings.tabTeachers": "老师",
    "settings.staffAccounts": "员工账户",
    "settings.staffAccountsDescription": "使用管理后台的管理员、校区经理和前台账户。",
    "settings.teacherAccounts": "老师账户",
    "settings.teacherAccountsDescription":
      "拥有 App 登录的老师。在此创建账户，方便他们登录并与学生聊天。",
    "settings.language": "语言",
    "settings.languageDescription":
      "选择管理后台的显示语言。您的选择会保存到账户，下次登录仍然有效。",
    "settings.languageSaved": "语言已更新。",
    "settings.saveLanguage": "保存语言",
    "settings.savingLanguage": "保存中…",
    "common.openSidebar": "打开侧边栏",
    "common.closeSidebar": "关闭侧边栏",
    "common.hideSidebar": "隐藏侧边栏",
    "common.showSidebar": "显示侧边栏",
    "common.resizeSidebar": "调整侧边栏宽度",
    "common.notAvailable": "—",
    "common.active": "活跃",
    "common.inactive": "非活跃",
    "teacherStatus.active": "在职",
    "teacherStatus.onLeave": "休假",
    "teacherStatus.inactive": "离职",
    "common.changeTeacherStatus": "更改 {name} 的状态",
    "common.save": "保存",
    "common.saving": "保存中…",
    "common.loading": "加载中…",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.confirm": "确认",
    "common.deleting": "删除中…",
    "common.signOut": "退出登录",
    "common.status": "状态",
    "common.edit": "编辑",
    "common.add": "添加",
    "common.remove": "移除",
    "common.close": "关闭",
    "common.back": "返回",
    "common.actions": "操作",
    "common.name": "姓名",
    "common.dateOfBirth": "出生日期",
    "common.birthday": "生日",
    "common.id": "编号",
    "common.email": "邮箱",
    "common.phone": "电话",
    "staffPosition.teacher": "老师",
    "staffPosition.frontDesk": "前台",
    "common.position": "职位",
    "common.hourlyRate": "时薪",
    "common.hourlyRatePlaceholder": "例如 18.00",
    "common.hoursWorked": "工作时长",
    "common.workDate": "工作日期",
    "common.clockIn": "上班时间",
    "common.clockOut": "下班时间",
    "common.durationHoursMinutes": "{hours}小时 {minutes}分钟",
    "common.monthTotal": "本月合计",
    "common.clickDayToLog": "点击某一天记录上班和下班时间。",
    "common.logHours": "记录工时",
    "common.editHours": "编辑工时",
    "common.saveHours": "保存工时",
    "common.noHourLogs": "暂无工时记录。",
    "common.deleteHourLogConfirm": "这将永久删除该日工时记录。",
    "common.dayPay": "工资",
    "common.hoursPaySummary": "{hours} 小时 · {pay}",
    "common.frontDeskNoClasses": "前台人员不授课。请在下方记录每日工时。",
    "common.linkFrontDeskTeacher": "关联前台档案",
    "common.createNewFrontDeskTeacher": "新建前台档案",
    "common.frontDeskAccountHelp":
      "前台账号只能访问“我的工时”和“日程”。请关联现有前台人员，或根据姓名与时薪新建档案。",
    "common.noFrontDeskTeachers":
      "本校园没有未关联的前台档案。将根据姓名和时薪新建档案。",
    "common.myHoursTitle": "我的工时",
    "common.myHoursSubtitle": "记录每天的上班和下班时间。",
    "common.frontDeskProfileMissing":
      "此账号尚未关联前台档案。请联系管理员处理。",
    "common.linkedLoginAccount": "关联登录账号",
    "common.linkedLoginAccountHelp":
      "关联前台登录账号后，他们在“我的工时”里保存的记录会显示在此老师页面。",
    "common.hoursSyncHint": "在“我的工时”记录的工时会显示在下方日历中。",
    "common.chooseFrontDeskAccount": "前台登录账号",
    "common.linkAccount": "关联账号",
    "common.unlinkAccount": "取消关联",
    "common.noUnlinkedFrontDeskAccounts":
      "暂无未关联的前台登录账号。请先在设置 → 员工账号中创建角色为“前台”的账号，然后再回来关联。",
    "common.linkedTeacher": "关联老师",
    "common.phones": "电话号码",
    "common.noPhones": "暂无电话号码记录。",
    "common.addPhone": "添加电话",
    "common.editPhone": "编辑电话",
    "common.savePhone": "保存电话",
    "common.deletePhoneConfirm": "这将永久删除此电话号码。",
    "common.phoneOwner": "号码归属",
    "common.ownerName": "联系人姓名",
    "common.ownerNamePlaceholder": "可选姓名",
    "common.primaryPhone": "主要",
    "phoneOwner.self": "本人",
    "phoneOwner.mother": "母亲",
    "phoneOwner.father": "父亲",
    "phoneOwner.grandmother": "祖母/外祖母",
    "phoneOwner.grandfather": "祖父/外祖父",
    "phoneOwner.guardian": "监护人",
    "phoneOwner.aunt": "阿姨/姑姑",
    "phoneOwner.uncle": "叔叔/舅舅",
    "phoneOwner.sibling": "兄弟姐妹",
    "phoneOwner.other": "其他",
    "common.teacher": "老师",
    "common.resume": "简历",
    "common.resumeHelp": "为这位老师上传 PDF 简历（最大 10 MB）。",
    "common.uploadResume": "上传简历",
    "common.replaceResume": "更换简历",
    "common.viewResume": "查看 PDF",
    "common.removeResume": "删除简历",
    "common.noResumeYet": "尚未上传简历。",
    "common.room": "教室",
    "common.subject": "科目",
    "common.instrument": "乐器",
    "common.track": "类别",
    "common.type": "类型",
    "common.schedule": "日程",
    "common.duration": "时长",
    "common.typicalDurationOptional": "可选常用时长",
    "common.durationMinutesPlaceholder": "例如 45",
    "common.lessonLengthHelp":
      "本节课上多久（分钟）。请输入任意正整数，例如 25、40 或 90。",
    "common.typicalDurationHelp":
      "这门课的常用时长（分钟）。每次排课时可以另选时长，不必按时长分别建课。",
    "common.student": "学生",
    "common.class": "课程",
    "common.date": "日期",
    "common.day": "星期",
    "common.time": "时间",
    "common.scheduleStudentOptional": "学生（可选）",
    "common.amount": "金额",
    "common.category": "类别",
    "common.plan": "课包",
    "trial.title": "【云乐艺校·体验课】",
    "trial.intro": "请填好下列资料发给我，前台老师会电话联系你：",
    "trial.childName": "宝贝姓名",
    "trial.lastName": "姓氏",
    "trial.dob": "出生年月",
    "trial.gender": "性别",
    "trial.genderMale": "男",
    "trial.genderFemale": "女",
    "trial.parentName": "家长姓名",
    "trial.phone": "联系电话",
    "trial.address": "居住地址",
    "trial.subject": "学习科目",
    "trial.oneToOne": "一对一",
    "trial.groupClass": "小组课",
    "trial.haveStudied": "是否学过",
    "trial.haveStudiedPlaceholder": "例如：学过两年钢琴，或第一次上课",
    "trial.suitableTime": "合适的试课时间",
    "trial.weekday": "工作日",
    "trial.weekend": "周末",
    "trial.duration": "试课时长",
    "trial.durationUnit": "分钟",
    "trial.fee": "试课费用",
    "trial.feePromoHelp": "可选 $25 或 $0（当前优惠）。",
    "trial.feePromo": "优惠",
    "trial.teacher": "老师",
    "trial.date": "日期",
    "trial.startTime": "开始时间",
    "trial.submit": "预约体验课",
    "trial.booking": "提交中…",
    "trial.booked": "体验课已预约",
    "trial.bookedHelp": "谢谢。前台老师会电话联系确认试课时间。",
    "trial.bookAnother": "再预约一节体验课",
    "trial.noTeachers": "目前没有可预约体验课的老师，请联系学校安排。",
    "trial.close": "关闭",
    "trial.bookButton": "预约体验课",
    "common.editPayment": "编辑付款",
    "common.editPaymentHelp":
      "如果记错了，可修改学生、课程、金额、日期或备注。",
    "common.savePayment": "保存付款",
    "common.paidAt": "付款时间",
    "common.total": "总计",
    "common.remaining": "剩余",
    "common.used": "已用",
    "common.absences": "缺勤",
    "common.role": "角色",
    "common.campus": "校区",
    "common.added": "添加时间",
    "common.processing": "处理中…",
    "common.continue": "继续",
    "common.decline": "拒绝",
    "common.noResults": "无结果。",
    "common.noMatchSearch": "没有符合搜索条件的结果。",
    "common.error.loadFailed": "无法加载{entity}：{message}",
    "common.empty.runSeed": "暂无{entity}。运行 npm run seed 填充示例数据。",
    "common.viewAll": "查看全部 →",
    "common.fullSchedule": "完整日程 →",
    "common.new": "新",
    "common.today": "今天",
    "common.previous": "上一页",
    "common.next": "下一页",
    "common.clear": "清除",
    "common.all": "全部",
    "common.of": "/",
    "common.hour": "1小时",
    "common.hours": "{count}小时",
    "common.minutes": "{count}分钟",
    "common.noTeacherAssigned": "未分配老师",
    "common.addRoom": "添加教室",
    "common.changeRoom": "更改教室",
    "common.assignRoom": "分配教室",
    "common.noRoomAssigned": "未分配教室",
    "common.editTeachers": "编辑老师",
    "common.editTeachersHelp":
      "为此课程添加或移除老师。把不应出现在这里的老师去掉。",
    "common.saveTeachers": "保存老师",
    "common.saveRoom": "保存教室",
    "common.inSession": "进行中",
    "common.noStudentsEnrolled": "暂无学生报名",
    "common.trialLabel": "试课",
    "common.enrolled": "已报名 {count} 人",
    "common.viewClass": "查看课程 →",
    "common.when": "时间",
    "common.notes": "备注",
    "common.note": "备注",
    "common.editNotes": "编辑备注",
    "common.studentNotesPlaceholder": "填写关于此学生的备注…",
    "common.viewStudentNotes": "查看学生备注",
    "common.noStudentNotes": "暂无备注。",
    "common.receipts": "收据",
    "common.receiptsHelp":
      "为学生上传收据照片（JPEG、PNG、WebP、GIF 或 HEIC · 最大 10 MB）。",
    "common.receiptPhoto": "收据照片",
    "common.receiptNotePlaceholder": "例如：3月学费付款",
    "common.saveReceipt": "保存收据",
    "common.allReceipts": "全部收据",
    "common.noReceiptsYet": "暂无收据。",
    "common.viewReceipt": "查看",
    "common.optional": "（可选）",
    "common.description": "描述",
    "common.year": "年份",
    "common.month": "月份",
    "common.reason": "原因",
    "common.editAmount": "编辑金额",
    "common.editPaymentAmount": "编辑付款金额",
    "common.editPurchaseAmount": "编辑购买金额",
    "common.editPaycheckAmount": "编辑工资总额",
    "common.editStatementAmount": "编辑报表金额",
    "common.editRecurringAmount": "编辑经常性金额",
    "common.editPricing": "编辑定价",
    "common.changePricing": "修改价格",
    "common.deletePricing": "删除价格",
    "common.deletePricingConfirm":
      "确定清除此课程的自定义价格？将恢复为系统计算价格。",
    "common.deletePricingFieldConfirm":
      "确定清除{field}？将恢复为系统计算价格。",
    "common.clearedClassPricing": "已清除课程定价",
    "common.noLinkedClass": "无关联课程",
    "common.editGrade": "编辑级别",
    "common.editGradeLevel": "编辑年级/级别",
    "common.editCredits": "编辑课时",
    "common.editClassCredits": "编辑课时余额",
    "common.editClassCreditsHelp":
      "直接输入要保留的数量。剩余课时按输入值保存，不会根据总计减已用自动计算。",
    "common.gradeLevel": "级别",
    "common.noGradeLevel": "无级别",
    "common.customGradeLevel": "自定义级别",
    "common.gradeLevelHelp":
      "显示为 科目 (G5)。可选择预设或输入自定义级别。",
    "common.artMaterialFeeNote":
      "材料费：+${pack20}（20节）/ +${pack50}（50节）",
    "common.monthlyRateOnly": "月费（无课时套餐）",
    "common.specialPacks": "特价套餐",
    "common.specialPacksSubtitle": "带开始和结束日期的限时促销价格。",
    "common.addSpecialPack": "添加特价套餐",
    "common.noSpecialPacks": "暂无特价套餐。",
    "common.specialPackPriceHelp":
      "未使用的价格可留空，至少填写一项价格。",
    "common.promoActiveNow": "进行中",
    "common.promoScheduled": "已安排",
    "common.promoBadge": "促销：{name}",
    "common.dates": "日期",
    "common.startDate": "开始日期",
    "common.endDate": "结束日期",
    "common.originalAmount": "原始金额",
    "common.currentAmount": "当前金额",
    "common.newAmount": "新金额",
    "common.saveCorrection": "保存更正",
    "common.correctionReasonPlaceholder": "为什么要更改此金额？",
    "common.correctionKeepsHistory":
      "原始金额会保留记录。此操作会在报表中创建调整项。",
    "common.manualEntryCorrectionHelp":
      "会创建冲销记录和更正后的新记录，以便保留可审计的账本。",
    "common.recurringAmountEditHelp":
      "仅更新未来月份的模板。已生成的报表条目保持不变。",
    "common.fromCorrection": "更正",
    "common.singleClassPrice": "单节课价格",
    "common.package20Price": "20 节课套餐价格",
    "common.package50Price": "50 节课套餐价格",
    "common.updatedClassPricing": "已更新课程定价",
    "settings.trialPricing": "试课定价",
    "settings.trialPricingDescription":
      "为每个校区设置试课费用和老师报酬。更改适用于新的试课预约。",
    "settings.trialFee": "试课费用",
    "settings.trialTeacherPay": "试课老师报酬",
    "settings.editTrialPricing": "编辑试课定价",
    "settings.updatedTrialPricing": "已更新校区试课定价",
    "common.credits": "课时",
    "common.noCreditsLeft": "课时已用完",
    "common.notMarked": "未标记",
    "common.makeUp": "补课",
    "common.creditUsed": "已扣课时",
    "common.noDataYet": "暂无数据。",
    "common.searchStudents": "搜索学生…",
    "common.searchStudentsByName": "按姓名搜索学生",
    "common.searchTutorsByName": "按姓名搜索老师",
    "common.searchClasses": "搜索课程…",
    "common.searchStaff": "按姓名、邮箱或角色搜索",
    "common.searchTeachers": "搜索或选择老师",
    "common.searchSubjects": "搜索或输入科目",
    "common.noSubjectsFound": "未找到匹配科目。",
    "common.useCustomSubject": "使用“{subject}”",
    "common.selectStudent": "选择学生",
    "common.selectTeacher": "选择老师",
    "common.selectClass": "选择课程",
    "common.selectSubject": "选择科目",
    "common.selectType": "选择类型",
    "common.selectTime": "选择时间",
    "common.noClassTypesAvailable": "该科目暂无课程类型。",
    "common.noClassTimesAvailable": "该科目和类型暂无上课时间。",
    "common.noScheduledTime": "暂无排课时间",
    "common.noStudentsYet": "暂无学生。",
    "common.noStudentsFound": "未找到学生。",
    "common.noTutorsYet": "暂无老师。",
    "common.noTutorsFound": "未找到老师。",
    "common.noClassesYet": "暂无课程。",
    "common.noClassesFound": "未找到课程。",
    "common.noClassesAvailable": "暂无可用课程。",
    "common.noAccountsYet": "暂无员工账户。",
    "common.noAccountsMatchSearch": "没有符合搜索条件的账户。",
    "common.noActiveEntity": "暂无活跃{entity}。",
    "common.noInactiveEntity": "暂无非活跃{entity}。",
    "common.countActiveEntity": "{count} 位活跃{entity}",
    "common.countActiveEntityPlural": "{count} 位活跃{entity}",
    "common.countFilteredEntity": "{filtered}/{total} 位活跃{entity}",
    "common.countInactiveEntity": "{count} 位非活跃{entity}",
    "common.countInactiveEntityPlural": "{count} 位非活跃{entity}",
    "common.countFilteredInactiveEntity": "{filtered}/{total} 位非活跃{entity}",
    "common.noClassesInTrackNamed": "{track}暂无{status}课程。",
    "common.oneStatusClassInTrack": "{track}有 1 门{status}课程",
    "common.countStatusClassesInTrack": "{track}有 {count} 门{status}课程",
    "common.filteredStatusClassesInTrack":
      "{track}显示 {filtered}/{total} 门{status}课程",
    "common.accountCount": "{count} 个账户",
    "common.accountCountPlural": "{count} 个账户",
    "common.countFilteredAccounts": "{filtered}/{total} 个账户",
    "common.packageCountPack": "{count}节课套餐",
    "common.backToStudents": "← 返回学生列表",
    "common.backToClasses": "← 返回课程列表",
    "common.backToTutors": "← 返回老师列表",
    "common.backToTeacher": "← 返回老师详情",
    "common.backToStudent": "← 返回学生详情",
    "common.backToSchedule": "← 返回课程表",
    "common.backToLeads": "← 返回线索",
    "common.backToDashboard": "← 返回首页",
    "common.backToStatements": "← 全部财务报表",
    "common.redNamesNoCredits": "红色姓名表示课时已用完",
    "common.lessonType": "课程类型",
    "common.unassigned": "未分配",
    "common.activate": "激活",
    "common.deactivate": "停用",
    "common.cannotDeactivateSelf": "您不能停用自己的账户。",
    "common.deleteAccount": "删除",
    "common.deleteAccountConfirm":
      "这将永久删除 {email}，并释放该邮箱以便重新创建账户。",
    "common.cannotDeleteSelf": "您不能删除自己的账户。",
    "common.street": "街道",
    "common.city": "城市",
    "common.state": "州",
    "common.zip": "邮编",
    "common.address": "地址",
    "common.noAddresses": "暂无地址记录。",
    "common.perClass": "每节课",
    "common.package20": "20节课套餐",
    "common.package50": "50节课套餐",
    "common.trial": "试课（无套餐）",
    "common.income": "收入",
    "common.expenses": "支出",
    "common.net": "净额",
    "common.fixedExpenses": "固定支出",
    "common.variableExpenses": "变动支出",
    "common.noIncome": "本月暂无收入记录。",
    "common.noExpenses": "本月暂无支出记录。",
    "common.noFixedExpenses": "本月暂无固定支出。租金等定期项目会显示在这里。",
    "common.noVariableExpenses": "本月暂无变动支出。老师工资和一次性费用会显示在这里。",
    "common.fromPayment": "来自付款",
    "common.fromPurchase": "来自购买",
    "common.fromPaycheck": "老师工资",
    "common.fromFrontDeskPay": "前台工资",
    "common.fromRecurring": "定期",
    "common.addIncome": "添加收入",
    "common.addExpense": "添加支出",
    "common.saveEntry": "保存条目",
    "common.addEntry": "添加条目",
    "common.recurringEntries": "定期条目",
    "common.deleteRecurringEntry": "删除定期条目",
    "common.deleteStatementEntryConfirm": "这将永久删除此财务报表条目。",
    "common.deleteTeacherPaycheckStatementConfirm":
      "这将从财务报表中移除老师工资，并清除该老师的课时费率，以便重新录入。",
    "common.deleteFrontDeskPayStatementConfirm":
      "这将从财务报表中移除前台工资，以便可以重新提交工时。",
    "common.deleteRecurringStatementInstanceConfirm":
      "这将删除本月的定期条目。定期模板仍会保留。",
    "common.dayOfMonth": "每月日期",
    "common.totalIncome": "总收入",
    "common.mark": "标记",
    "common.go": "前往",
    "common.pickDate": "选择日期…",
    "common.markAllPresent": "全部标记出席（{count}）",
    "common.markedPresent": "已标记 {marked} 人出席（{skipped} 人已标记）",
    "common.noEnrolledStudents": "暂无报名学生",
    "common.selectStudentAbove": "请在上方选择学生以标记考勤。",
    "common.noClassesScheduled": "{name} 在此日期没有安排课程。",
    "common.allTeachers": "全部老师",
    "common.previousWeek": "上一周",
    "common.nextWeek": "下一周",
    "common.previousDay": "上一天",
    "common.nextDay": "下一天",
    "common.weekView": "周",
    "common.dayView": "日",
    "common.teacherDayList": "老师当日课表",
    "common.teacherDayListHelp":
      "选择老师和日期，查看当天所有课程与学生。",
    "common.addStudentToSchedule": "添加学生",
    "common.addStudentToScheduleHelp":
      "选择学生，再选择乐器和本节课时长。",
    "common.addGroupClassToSchedule": "添加小组课",
    "common.addGroupClassToScheduleHelp":
      "选择学生，再选择乐器和本节课时长。",
    "common.selectTeacherToAddStudent":
      "请先选择老师，然后选择已有学生或添加新学生。",
    "common.teacherStudents": "该老师的学生",
    "common.searchTeacherStudents": "搜索该老师的学生，或输入以查找所有学生",
    "common.students": "学生",
    "common.selectAtLeastOneStudent": "请至少选择一名学生。",
    "common.createNewClass": "创建新课程…",
    "common.addToSchedule": "添加到日程",
    "common.clickEmptySlotToAdd": "选择老师后，点击空白时间即可添加一对一或小组课。",
    "common.downloadPdf": "PDF",
    "common.pdfPrintHint": "在打印对话框中选择“存储为 PDF”即可下载。",
    "common.pdfPopupBlocked": "无法打开 PDF 窗口。请允许本站弹出窗口后重试。",
    "common.frontDeskTimesheet": "前台工时表",
    "common.noHoursLoggedThisMonth": "本月暂无工时记录。",
    "common.paycheckReceivedAck": "本人确认已收到此工资。",
    "common.signature": "签名",
    "common.hideTeacherFilters": "隐藏老师筛选",
    "common.showTeacherFilters": "显示老师筛选",
    "common.clearFilter": "清除筛选",
    "common.showingClassesFor": "显示 {name} 的课程",
    "common.noScheduledClasses": "未找到已安排的课程。",
    "common.noScheduleYet": "暂无课程日程安排。",
    "common.reschedule": "改期",
    "common.rescheduledThisWeek": "本周已改期",
    "common.repeatsWeekly": "每周重复",
    "common.saveChanges": "保存更改",
    "common.addTime": "添加时间",
    "common.addMeetingTime": "添加上课时间",
    "common.editMeetingTime": "编辑上课时间",
    "common.copy": "复制",
    "common.copyMeetingTime": "复制上课时间",
    "common.copyClass": "复制课表",
    "common.copyClassHelp":
      "为同一课程再添加一个上课时间。修改日期或时间后保存。",
    "common.changeTime": "修改时间",
    "common.removeMeetingTime": "移除上课时间？",
    "common.removeMeetingTimeConfirm": "这将从课程日程中移除该上课时间。",
    "common.recordPayment": "记录付款",
    "common.recordPurchase": "记录购买",
    "common.noPaymentsYet": "暂无付款记录。",
    "common.noPurchasesYet": "暂无购买记录。",
    "common.confirmPayment": "确认付款",
    "common.confirmPurchase": "确认购买",
    "common.paymentRecorded": "付款已记录 — {student} 为 {count} 节课（{subject}）付款",
    "common.purchaseRecorded": "已为 {student} 记录购买。",
    "common.refundCredits": "退还课时",
    "common.exchangeCredits": "换课",
    "common.transferTo": "转至",
    "common.allCreditsFromPayment": "此付款的全部 {count} 课时",
    "common.howManyClasses": "多少节课？",
    "common.selectStudentFirst": "请先选择学生。",
    "common.selectTeacherFirst": "请先选择老师。",
    "common.selectClassFirst": "请先选择课程。",
    "common.selectSubjectFirst": "请先选择科目。",
    "common.selectTypeFirst": "请先选择类型。",
    "common.selectTimeFirst": "请先选择时间。",
    "common.createEvent": "创建活动",
    "common.postEvent": "发布",
    "common.posting": "发布中…",
    "common.deletePost": "删除此帖子？",
    "common.deletePostConfirm": "这将永久删除该帖子及所有附件。",
    "common.noEventsYet": "暂无活动帖子。",
    "common.createFirstEvent": "创建您的第一个活动帖子。",
    "common.shareFirstUpdate": "分享第一条动态",
    "common.newPostsInDays": "过去 {days} 天内有 {count} 条新帖子",
    "common.latestNews": "最新学校新闻和亮点",
    "common.photosVideos": "{count} 个照片/视频",
    "common.changePassword": "修改密码",
    "common.currentPassword": "当前密码",
    "common.newPassword": "新密码",
    "common.confirmPassword": "确认新密码",
    "common.updatePassword": "更新密码",
    "common.passwordUpdated": "密码更新成功。",
    "common.setPassword": "设置密码",
    "common.setManagerPasswordHelp": "为 {name} 设置新密码。",
    "common.setManagerPasswordHint":
      "重置经理或老师登录密码：打开对应校区标签，点击姓名下方的“设置密码”。",
    "common.addStaffAccount": "添加员工账户",
    "common.addManager": "添加经理",
    "common.addTeacherAccount": "添加老师",
    "common.addTeacherAccountHelp":
      "为老师创建 App 登录（与校区经理不同）。可关联已有老师资料，或一并新建。",
    "common.linkTeacherProfile": "老师资料",
    "common.createNewTeacherProfile": "创建新老师资料",
    "common.noTeacherProfiles":
      "此校区暂无未关联的老师资料。可在创建账户时一并新建。",
    "common.addStatenIslandManager": "添加史泰登岛经理",
    "chat.title": "老师聊天",
    "chat.subtitle": "查看老师与学生的对话。先选老师，再选学生会话。",
    "chat.pickTeacher": "老师",
    "chat.pickConversation": "会话",
    "chat.noTeachers": "还没有老师 App 登录。请在 设置 → 老师 中添加。",
    "chat.noConversations": "这位老师还没有与学生的会话。",
    "chat.noMessages": "此会话暂无消息。",
    "chat.selectTeacherHint": "选择一位老师以查看其学生聊天。",
    "chat.selectConversationHint": "选择一个会话以阅读消息。",
    "chat.fromTeacher": "老师",
    "chat.fromStudent": "学生",
    "chat.messageCount": "{count} 条消息",
    "chat.conversationCount": "{count} 个会话",
    "chat.lastActive": "最近活动 {when}",
    "common.createAccount": "创建账户",
    "common.creating": "创建中…",
    "common.enrolling": "报名中…",
    "common.adding": "添加中…",
    "common.recording": "记录中…",
    "common.deducting": "扣除中…",
    "common.marking": "标记中…",
    "common.grant": "授予",
    "common.refund": "退款",
    "common.writeOff": "核销",
    "common.makeUpCredit": "补课",
    "common.creditsToAdd": "添加课时数",
    "common.sessionDate": "上课日期",
    "common.creditCost": "课时费用（1或2）",
    "common.allCredits": "全部 {count} 课时",
    "common.deductClass": "扣除1节课",
    "common.markAbsent": "标记缺席",
    "common.classDeducted": "课时已扣除。",
    "common.markedAbsent": "已标记缺席。",
    "common.paycheck": "工资",
    "common.ratePerClass": "每节课费率",
    "common.totalPaycheck": "工资总额",
    "common.reviewPaycheck": "审核并记录工资",
    "common.confirmPaycheck": "确认工资",
    "common.noPaycheckPeriods": "暂无工资记录。",
    "common.viewInStatements": "在财务报表中查看 →",
    "common.recorded": "已记录 ·",
    "common.addNewStudent": "添加新学生",
    "common.addNewStudents": "添加新学生",
    "common.addNewTutor": "添加新老师",
    "common.addNewClass": "添加新课程",
    "common.addCourse": "添加课程",
    "common.addCourseHelp": "创建课程名称、时长、类型和价格。",
    "common.courseName": "课程名称",
    "common.courseNamePlaceholder": "例如：吉他",
    "common.renameCourse": "重命名课程",
    "common.deleteCourse": "删除课程",
    "common.deleteCourseConfirm":
      "这将永久删除此学费课程，包括该课程的课表、报名、课时和付款记录。学生档案不会被删除。",
    "common.saveStudent": "保存学生",
    "common.saveTutor": "保存老师",
    "common.saveClass": "保存课程",
    "common.saveClasses": "保存课程",
    "common.saveAddress": "保存地址",
    "common.addToClass": "添加到课程",
    "common.addToClasses": "添加到课程",
    "common.addStudents": "添加学生",
    "common.enrollStudent": "学生报名",
    "common.removeFromClass": "从课程中移除",
    "common.removeClass": "移除课程？",
    "common.deleteStudent": "删除学生",
    "common.deleteStudentConfirm": "这将永久删除 {name} 及所有相关记录。",
    "common.deleteTeacher": "删除老师",
    "common.deleteTeacherConfirm":
      "这将永久删除 {name}，以及其课程分配、工时记录和工资记录。",
    "common.deleteClass": "删除课程",
    "common.deleteClassConfirm":
      "这将永久删除此课程，包括该课程的课表、报名、课时和付款记录。学生档案不会被删除。",
    "common.deleteTrialConfirm":
      "这将永久删除此试课，包括课表、报名、课时和试课付款记录。",
    "common.deleteAddress": "删除地址",
    "common.deleteAddressConfirm": "这将永久删除此地址。",
    "common.editDateOfBirth": "编辑出生日期",
    "common.editClass": "编辑课程",
    "common.editTutor": "编辑老师",
    "common.editStudent": "编辑学生",
    "common.editPageHelp": "直接修改下方任意信息后保存。取消则放弃未保存的更改。",
    "common.editAddress": "编辑地址",
    "common.addAddress": "添加地址",
    "common.assignClasses": "分配课程",
    "common.createClassForTeacherHelp":
      "按乐器为该老师创建课程。上课时长在排课时再选，不必为不同时长重复建课。",
    "common.firstName": "名",
    "common.lastName": "姓",
    "common.startingClassSessions": "初始课时",
    "common.startingClassSessionsHelp": "报名课程时可选的预付费课时。",
    "common.street1": "街道地址1",
    "common.street2": "街道地址2",
    "common.selectState": "选择州",
    "common.classCredits": "课时余额",
    "common.classHistory": "上课记录",
    "common.classHistoryHelp": "出席、缺勤和课时使用情况。",
    "common.allTimeByClass": "按课程统计",
    "common.notEnrolled": "未报名任何课程。",
    "common.totalClassesTaken": "总上课次数",
    "common.studentId": "学生编号",
    "common.tutorId": "老师编号",
    "common.classId": "课程编号",
    "common.classes": "课程",
    "common.enrollToTrack": "为该学生报名课程以跟踪预付费课时。",
    "common.classCreditsTitle": "课时余额 — {subject}",
    "common.attendanceHistory": "考勤记录",
    "common.previousMonth": "上个月",
    "common.nextMonth": "下个月",
    "common.selectHighlightedDate": "选择高亮日期查看课程。",
    "common.noSessionsOnDate": "此日期无课程。",
    "common.sessionsOnDate": "{date} 的课程",
    "common.purchases": "购买",
    "common.deleteClassSchedule": "删除",
    "common.scheduleHelp":
      "尽量为每个上课时间关联学生。每次可单独输入时长（分钟）。",
    "common.noMeetingTimes": "暂无上课时间。",
    "common.activeEnrollment": "活跃报名",
    "common.inactiveEnrollment": "非活跃报名",
    "common.toggleActiveStatus": "切换 {name} 的活跃状态",
    "common.quickLinks": "快捷链接",
    "common.todaysOverview": "今日动态，以及学生、老师和课程的快捷入口。",
    "common.happeningNow": "正在进行",
    "common.classesInSession": "当前正在进行的课程",
    "common.noClassesMeetingNow": "目前没有正在进行的课程。",
    "common.comingUpToday": "今日即将开始",
    "common.classesStillScheduled": "今天剩余的课程安排",
    "common.noMoreClassesToday": "今天没有更多课程安排。",
    "common.lowCreditsTitle": "课时不足",
    "common.lowCreditsSubtitle": "各课程合计剩余 0 或 1 课时的学生",
    "common.lowCreditsEmpty": "暂无剩余 0 或 1 课时的学生。",
    "common.creditsRemainingCount": "剩余 {count}",
    "common.allTracks": "全部类别",
    "common.classTracks": "课程类别",
    "common.noClassesInTrack": "此类别暂无{status}课程。",
    "common.tuitionsSubtitle": "官方价目表：单节课费率、预付费套餐，以及限时特价套餐。",
    "sheet.officialTitle": "iSmart Music center 云乐艺校单价表",
    "sheet.officialSubtitle":
      "按官方价目表排序。钢琴 / 小提琴一对一通过时长与级别选择对应价格。",
    "sheet.piano1v1": "钢琴一对一",
    "sheet.violin1v1": "小提琴一对一",
    "sheet.level1v1Hint":
      "选择时长与级别（G0–G2 对应 0–2 级等），查看单节、20 节、50 节价格。",
    "sheet.otherInstrument1v1": "吉他 / 架子鼓 / 声乐 / 古筝 / 大提琴一对一",
    "sheet.choirOrchestraTheory": "合唱团 / 乐团 / 乐理课 — 60 分钟",
    "sheet.talentExam": "艺考班 — 60 分钟",
    "sheet.specialtyGroup": "弹唱 / 模特走秀（小组课）— 60 分钟",
    "sheet.art": "画画（小组课）",
    "sheet.dance": "舞蹈 / 爵士舞 / 中国舞 / 街舞",
    "sheet.band": "乐队小组课 — 60 分钟",
    "sheet.art1v1": "一对一画画课",
    "sheet.grade.g0_2": "0–2 级",
    "sheet.grade.g3_4": "3–4 级",
    "sheet.grade.g5_6": "5–6 级",
    "sheet.grade.g7_8": "7–8 级",
    "sheet.grade.performance": "演奏级",
    "sheet.perMonth": "/ 月",
    "sheet.materialFeeAdd": "+${amount} 材料费",
    "sheet.danceBagAdd": "+${amount} 舞蹈装备包",
    "sheet.bandMonthlyNote": "每月 $160（4 节课）；无 20/50 节套餐。",
    "sheet.otherClasses": "其他课程",
    "sheet.otherClassesSubtitle":
      "未列入官方价目表的课程。此处价格仍用于付款与编辑。",
    "common.paymentsSubtitle": "记录课程付款。已完成的付款会自动出现在财务报表中。",
    "common.purchasesSubtitle": "书籍、材料和其他学生购买。",
    "common.statementsSubtitle": "月度收支汇总。",
    "common.attendanceSubtitle": "为报名学生标记每日考勤。出席和缺席扣除1课时；请假不扣。",
    "common.scheduleSubtitle":
      "选择老师后，点击空白时间即可添加学生。拖动可改时间。按住 Option（Alt）再拖动可复制课表。",
    "common.eventsSubtitle": "分享学校新闻、照片和视频亮点。",
    "common.attendanceFooter": "已安排的补课会等到补课时间过后再扣除课时。",
    "common.rescheduleThisOccurrence": "仅此次",
    "common.rescheduleAllFuture": "所有未来课程",
    "common.deleteFromCalendar": "从日历删除",
    "common.deleteThisOccurrence": "仅此次",
    "common.deleteAllOccurrences": "整个日程",
    "common.deleteScheduleEventConfirm": "从日历中移除此上课时间？",
    "common.deleteTrialFromCalendarConfirm":
      "这将永久删除此试课，包括试课付款和报名。",
    "common.deleteAllOccurrencesConfirm": "这将永久删除整个重复日程。",
    "common.originalTime": "原时间",
    "common.newTime": "新时间",
    "common.originalDuration": "原时长",
    "common.newDuration": "新时长",
    "common.changeDuration": "修改时长",
    "common.updateClassTime": "更新上课时间",
    "common.searchClassesPrices": "搜索课程、老师或价格…",
    "common.packageOff": "{count}节课套餐，{rate}% 折扣 — 仅限一对一和小组",
    "common.trialNoPackages": "试课（无套餐）",
    "common.classCount": "{count} 节课",
    "common.classCountPlural": "{count} 节课",
    "common.studentsMarked": "{students} 位学生 · {marked} 已标记",
    "common.studentCount": "{count} 位学生",
    "common.studentCountPlural": "{count} 位学生",
    "common.alreadyMarked": "已标记",
    "common.areYouSure": "确定吗？",
    "common.confirmPaycheckTitle": "确认工资",
    "common.confirmPaycheckHelp": "这将记录工资并添加到月度财务报表。",
    "common.confirmAndRecordPaycheck": "确认并记录工资",
    "common.reviewFrontDeskPay": "确认并提交到财务报表",
    "common.confirmFrontDeskPayTitle": "将工时提交到财务报表",
    "common.confirmFrontDeskPayHelp":
      "这将把本月前台工时与工资作为支出添加到财务报表。",
    "common.confirmAndSubmitFrontDeskPay": "确认并提交",
    "common.frontDeskPayAlreadyRecorded": "本月已提交到财务报表。",
    "common.noFrontDeskHoursToSubmit": "请先记录本月工时再提交。",
    "common.noPostsYet": "暂无帖子。",
    "common.photos": "照片",
    "common.videos": "视频",
    "common.mediaCount": "{count} 个{type}",
    "common.previousMedia": "上一个",
    "common.nextMedia": "下一个",
    "common.weekly": "每周",
    "common.oneTime": "单次",
    "common.startTime": "开始时间",
    "common.endTime": "结束时间",
    "common.am": "上午",
    "common.pm": "下午",
    "common.hourInput": "小时",
    "common.minuteInput": "分钟",
    "common.amPm": "上午或下午",
    "common.noLocation": "无地点",
    "common.location": "地点",
    "common.noStaffAccounts": "暂无员工账户。",
    "common.couldNotLoadStaff": "无法加载员工账户：{message}",
    "common.creditsButton": "课时",
    "common.exchange": "换课",
    "common.writeOffAction": "核销",
    "common.refundAction": "退款",
    "common.grantAction": "授予",
    "common.makeUpAction": "补课",
    "common.searchClassesFull": "按科目、类别、老师、教室或类型搜索课程",
    "common.searchAndSelectClasses": "搜索并选择课程",
    "common.searchAndSelectStudents": "搜索并选择学生",
    "common.searchAndSelectTeachers": "搜索并选择老师",
    "common.assignMultipleTeachersHelp":
      "可以为同一门课分配多位老师。先选中的老师为主讲老师。",
    "common.addNewTutorInline": "添加新老师",
    "common.noTutorsAddFirst": "暂无老师，请先添加。",
    "common.noRoomsAvailable": "暂无可用教室。",
    "common.placeholderSubject": "例如：钢琴、声乐、芭蕾",
    "common.placeholderDescription": "描述",
    "common.placeholderPurchase": "例如：钢琴书、节拍器、演出费",
    "common.placeholderEventTitle": "标题（可选）",
    "common.placeholderEventBody": "学校发生了什么？",
    "common.purchaseDescription": "描述",
    "common.confirmPurchaseTitle": "确认购买",
    "common.confirmPaymentTitle": "确定吗？",
    "common.paymentPlanHelp": "为此课程选择课包。",
    "common.singleClassLabel": "单节课",
    "common.activeEnrolled": "活跃 · 已报名 {count} 人",
    "common.activeEnrolledSummary": "{active} 活跃 · {enrolled} 已报名",
    "common.studentsEnrolled": "已报名学生",
    "common.noStudentsEnrolledInClass": "此课程暂无学生报名。",
    "common.classPayments": "课程付款",
    "common.studentPurchases": "学生购买",
    "common.teacherPaycheck": "老师工资",
    "common.statementMonthIncome": "{month} 的收支。",
    "common.statementMonthExpense": "{month} 的支出明细。",
    "common.allExpenses": "全部支出",
    "common.fixedExpensesTab": "固定支出",
    "common.variableExpensesTab": "变动支出",
    "common.recurringExpense": "定期支出",
    "common.addRecurringEntry": "添加定期条目",
    "common.noRecurringEntries": "暂无定期条目。",
    "common.recurringEntriesHelp": "定期条目会自动添加到每月财务报表。",
    "common.statementEntries": "报表条目",
    "common.noStatementsYet": "暂无财务报表。记录收入或支出以开始。",
    "common.statementsListHelp": "月度收支汇总。",
    "common.auth.signIn": "登录",
    "common.auth.signingIn": "登录中…",
    "common.auth.signInTitle": "登录您的账户",
    "common.auth.emailAddress": "邮箱地址",
    "common.auth.password": "密码",
    "common.auth.needAccount": "需要账户？请在设置中请管理员为您创建。",
    "common.auth.brooklynAdmin": "布鲁克林，纽约 · 管理",
    "common.auth.signInDescription": "登录 iSmart 音乐学校管理后台。",
    "enum.classTrack.instrumental": "器乐",
    "enum.classTrack.vocal": "声乐",
    "enum.classTrack.composition": "作曲",
    "enum.classTrack.dance": "舞蹈",
    "enum.classTrack.music_education": "音乐教育",
    "enum.classTrack.other": "其他",
    "enum.lessonType.private": "一对一课程",
    "enum.lessonType.group": "小组课程",
    "enum.lessonType.trial": "试课",
    "enum.paymentClassType.trial": "试课",
    "enum.paymentClassType.private": "一对一",
    "enum.paymentClassType.group": "小组课",
    "enum.paymentStatus.completed": "已完成",
    "enum.paymentStatus.refunded": "已退款",
    "enum.paymentStatus.exchanged": "已换课",
    "enum.paymentPlan.single": "单节课",
    "enum.paymentPlan.package": "{count}节课套餐",
    "enum.attendance.present": "出席",
    "enum.attendance.late": "迟到",
    "enum.attendance.absent": "缺席",
    "enum.attendance.excused": "请假缺勤",
    "enum.attendanceDescription.present": "已出席 — 扣除1课时",
    "enum.attendanceDescription.late": "迟到 — 扣除1课时",
    "enum.attendanceDescription.absent": "未出席 — 扣除1课时",
    "enum.attendanceDescription.excused": "请假 — 不扣课时",
    "enum.staffRole.admin": "管理员",
    "enum.staffRole.manager": "经理",
    "enum.staffRole.teacher": "老师",
    "enum.staffRole.frontDesk": "前台",
    "enum.staffLocation.brooklyn": "布鲁克林",
    "enum.staffLocation.staten_island": "史泰登岛",
    "enum.staffLocation.brooklynLabel": "布鲁克林，纽约",
    "enum.staffLocation.statenIslandLabel": "史泰登岛，纽约",
    "enum.leadStatus.new": "新建",
    "enum.leadStatus.contacted": "已联系",
    "enum.leadStatus.enrolled": "已报名",
    "enum.leadStatus.closed": "已关闭",
    "leads.subtitle":
      "跟踪咨询和试课学生——联系方式、描述和跟进信息。",
    "leads.empty": "暂无潜在客户。添加咨询或预约试课。",
    "leads.addLead": "添加潜在客户",
    "leads.addLeadDescription":
      "记录学生姓名、联系方式、地址和简短描述。",
    "leads.editLead": "编辑潜在客户",
    "leads.deleteLead": "删除潜在客户",
    "leads.deleteLeadConfirm":
      "确定删除 {name} 的潜在客户记录？此操作无法撤销。",
    "leads.parentInfo": "学生",
    "leads.parentFirstName": "名",
    "leads.parentLastName": "姓",
    "leads.studentInfo": "学生",
    "leads.studentFirstName": "名",
    "leads.studentLastName": "姓",
    "leads.studentFirstNameRequired": "学生名为必填项。",
    "leads.address": "地址",
    "leads.contact": "联系",
    "leads.needsFutureContact": "需要后续联系",
    "leads.noFutureContactNeeded": "无需跟进",
    "leads.description": "描述",
    "leads.descriptionPlaceholder": "咨询内容、感兴趣的乐器、通话备注等。",
    "leads.noDescription": "暂无描述。",
    "leads.children": "孩子",
    "leads.noChildren": "尚未添加孩子。",
    "leads.addChild": "添加孩子",
    "leads.editChild": "编辑孩子",
    "leads.deleteChildConfirm": "确定从该潜在客户中移除 {name}？",
    "leads.childLastName": "姓",
    "leads.background": "背景",
    "leads.backgroundPlaceholder": "年龄、年级、兴趣、学习需求等。",
    "leads.experience": "经验",
    "leads.experiencePlaceholder": "以往音乐课程、乐器、比赛经历等。",
    "leads.searchPlaceholder": "按姓名、电话、邮箱或描述搜索",
    "leads.countShown": "显示 {total} 条中的 {filtered} 条",
    "leads.summaryTabs": "潜在客户汇总",
    "leads.tabAll": "全部",
    "leads.tabThisMonth": "本月",
    "leads.tabInquiries": "咨询",
    "leads.tabTrials": "试课",
    "leads.type": "类型",
    "leads.typeInquiry": "咨询",
    "leads.typeTrial": "试课",
    "leads.emptyThisMonth": "本月暂无咨询或试课。",
    "leads.emptyInquiries": "暂无咨询记录。",
    "leads.emptyTrials": "暂无试课学生。",
    "leads.makeOfficial": "转为正式学生",
    "leads.makeOfficialDescription":
      "将 {name} 转为正式学生，以便报名常规课程。",
    "leads.makeOfficialHelp":
      "正式学生可报名多门课程。",
    "leads.makeTrialOfficialDescription":
      "将 {name} 从单节试课升级为正式学生，以便报名常规课程。",
    "leads.makeTrialOfficialHelp":
      "设置起始课时后打开学生档案，方便添加课程。",
    "leads.addNewStudent": "添加新学生…",
    "leads.trialOneClassOnly": "仅试课",
    "leads.viewLead": "查看潜在客户",
    "leads.monthSummaryTitle": "{month} 汇总",
    "leads.monthSummarySubtitle":
      "共 {total} 条 · 咨询 {inquiries} · 试课 {trials}",
    "leads.createdAt": "创建于 {date}",
    "leads.updatedAt": "更新于 {date}",
    "leads.convertToStudent": "转为正式学生",
    "leads.convertToStudentDescription":
      "为 {name} 创建正式学生档案，将复制姓名、出生日期、背景和经验。",
    "leads.convertAllToStudents": "全部转换 ({count})",
    "leads.convertAllDescription":
      "为该潜在客户下的全部 {count} 个孩子创建正式学生档案。",
    "leads.startingClassSessions": "起始课时",
    "leads.convertAddressNote": "如有地址，将复制到每位新学生。",
    "leads.viewStudent": "查看学生",
    "leads.notYetStudent": "仅潜在客户",
    "leads.parentFirstNameRequired": "家长名为必填项。",
    "leads.phoneRequired": "电话号码为必填项。",
    "enum.month.january": "一月",
    "enum.month.february": "二月",
    "enum.month.march": "三月",
    "enum.month.april": "四月",
    "enum.month.may": "五月",
    "enum.month.june": "六月",
    "enum.month.july": "七月",
    "enum.month.august": "八月",
    "enum.month.september": "九月",
    "enum.month.october": "十月",
    "enum.month.november": "十一月",
    "enum.month.december": "十二月",
    "format.statementMonth": "{year}年{month}",
    "enum.statementEntryType.income": "收入",
    "enum.statementEntryType.expense": "支出",
    "enum.statementExpenseCategory.fixed": "固定",
    "enum.statementExpenseCategory.variable": "变动",
    "enum.weekday.sunday": "周日",
    "enum.weekday.monday": "周一",
    "enum.weekday.tuesday": "周二",
    "enum.weekday.wednesday": "周三",
    "enum.weekday.thursday": "周四",
    "enum.weekday.friday": "周五",
    "enum.weekday.saturday": "周六",
    "enum.schedule.repeatsWeekly": "（每周重复）",
    "enum.schedule.oneTime": "（单次）",
    "enum.schedule.unknownDay": "未知日期",
    "time.justNow": "刚刚",
    "time.minutesAgo": "{count}分钟前",
    "time.hoursAgo": "{count}小时前",
    "time.daysAgo": "{count}天前",
    "common.attendancePickDateHelp":
      "选择日期后，可查看今日有课的全部老师或其中一位老师。",
    "common.classesOnDate": "{date} 的课程",
    "common.attendanceAllClassesHelp":
      "学生按老师分组，每行显示两位老师。",
    "common.noClassesOnDate": "此日期没有安排课程。",
    "common.viewStudentClassesOnly": "在上方选择学生以仅查看其课程。",
    "common.classCountOnDate": "{date} 共 {count} 节课",
    "common.makeupLesson": "补课",
    "common.makeUpClass": "安排补课",
    "common.teachersToday": "今日有课老师",
    "common.allTeachersToday": "今日有课的全部老师",
    "common.totalClass": "总课时",
    "common.remainingClass": "剩余课时",
    "common.makeupDate": "补课日期",
    "common.makeupTime": "补课时间",
    "common.saveMakeup": "保存补课",
    "common.makeupDialogHelp":
      "为这名学生安排补课，默认仍是同一位老师。课时会在补课时间过后再扣除。",
    "common.makeupScheduled": "补课 {date} · {time}",
    "common.rescheduleMakeup": "改期补课",
    "common.noTeachersToday": "此日期没有老师有课。",
    "common.notScheduled": "未安排",
    "common.paymentOptionUnavailable": "此课程不支持该付款选项。",
    "common.noActiveClassesFor": "{name} 暂无活跃课程。",
    "common.recordPaymentDialogHelp":
      "选择学生、老师、科目、类型、时间和付款课时数。收入会自动添加到财务报表。",
    "common.confirmPaymentBeforeRecord": "记录前请确认此付款。",
    "common.paidFor": "为",
    "common.addedToStatementsIncome": "这将添加到本月财务报表的收入中。",
    "common.sessionCount": "{count} 节课时",
    "common.sessionCountPlural": "{count} 节课时",
    "common.purchaseRecordedDetail":
      "购买已记录 — {student} 为 {description} 付款 {amount}。",
    "common.describePurchase": "请描述购买内容。",
    "common.enterValidAmount": "请输入大于零的有效金额。",
    "common.purchasesEmptyHelp": "记录学生购买的书籍、材料等物品。",
    "common.payingFor": "正在购买",
    "common.confirmPurchaseBeforeRecord": "记录前请确认此购买。",
    "common.purchaseDialogHelp":
      "书籍、材料等。收入会自动添加到本月财务报表。",
    "common.whatPayingFor": "购买内容",
    "common.item": "物品",
    "common.assignClassesForPaycheck": "请先为该老师分配课程再计算工资。",
    "common.classesThisPeriod": "本期 {count} 节课",
    "common.recordedAt": "记录于 {date}",
    "common.recordedAsExpenseFor": "已记录为 {month} 的支出。",
    "common.paycheckRatesHelp":
      "课时按科目和级别汇总（例如「小提琴 0–2 级」）。数量基于已使用或标记缺席的课程。费率按科目+级别保存，并在其他月份沿用，直到您更改。",
    "common.subtotal": "小计",
    "common.confirmPaycheckReview":
      "记录前请审核 {month} 的完整课程列表。",
    "common.paycheckExpenseWillRecord":
      "{count} 节课将记录为 {month} 财务报表的支出。",
    "common.statementsAutoMonths":
      "暂无财务报表。记录付款后月份会自动出现。",
    "common.teachers": "老师",
    "common.subjectClassCount": "{count} 门课",
    "common.showSubjectClasses": "显示{subject}的课程",
    "common.hideSubjectClasses": "隐藏{subject}的课程",
    "common.teacherCount": "{count} 位老师",
    "common.durationsAvailable": "时长",
    "common.selectTeacherForSubject": "选择该科目的老师",
    "common.teacherFilterHelp":
      "选择一个或多个老师。全部不选则显示所有人。",
    "common.clearStudentFilter": "清除学生筛选",
    "common.noScheduleAddOnClass":
      "暂无课程日程。请在课程详情页添加上课时间。",
    "common.showingClassesNoneFound": " — 未找到已安排的课程。",
    "common.daysWithClassHistory":
      "{count} 天有上课记录。请选择高亮日期。",
    "common.noClassHistory": "暂无上课记录。",
    "common.autoRecorded": "自动记录",
    "common.creditsUsedCount": "已用 {count} 课时",
    "common.classHistoryOnDay": "当天共 {count} 节课。",
    "common.selectDateForHistory": "在日历上选择高亮日期查看上课记录。",
    "common.showingStaffFor": "显示 {location} iSmart 的员工。",
    "common.statenIslandManagerHelp":
      "管理员可在此标签页为史泰登岛创建经理账户。",
    "common.classTrackLabel": "课程类别",
    "common.noMeetingTimesAdd": "暂无上课时间。请添加每周或单次时段。",
    "common.rate": "费率",
    "common.classesColumn": "课时数",
    "common.showMedia": "显示媒体 {index}",
    "common.enterPayRateForClass": "请至少为一门课程输入课时费。",
    "enum.classTrack.instrumentalDesc": "钢琴、弦乐、管乐、打击乐等器乐",
    "enum.classTrack.vocalDesc": "声乐、合唱和歌唱课程",
    "enum.classTrack.compositionDesc": "作曲和原创音乐",
    "enum.classTrack.danceDesc": "芭蕾、街舞、踢踏舞等舞蹈课程",
    "enum.classTrack.music_educationDesc": "乐理、音乐剧和合奏技能",
    "enum.classTrack.otherDesc": "不属于以上类别的课程",
  },
};

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
) {
  const dictionary = translations[language] ?? translations.en;
  let text = dictionary[key] ?? translations.en[key] ?? String(key);

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replaceAll(`{${param}}`, String(value));
    }
  }

  return text;
}

export function createTranslator(language: AppLanguage) {
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(language, key, params);
}

export function getNavTranslationKey(href: string): TranslationKey {
  switch (href) {
    case "/":
      return "nav.dashboard";
    case "/students":
      return "nav.students";
    case "/leads":
      return "nav.leads";
    case "/classes":
      return "nav.classes";
    case "/tutors":
      return "nav.tutors";
    case "/tuitions":
      return "nav.tuitions";
    case "/payments":
    case "/payments/purchases":
    case "/purchases":
      return "nav.payments";
    case "/statements":
      return "nav.statements";
    case "/attendance":
      return "nav.attendance";
    case "/schedule":
      return "nav.schedule";
    case "/my-hours":
      return "nav.myHours";
    case "/events":
      return "nav.events";
    case "/chat":
      return "nav.chat";
    case "/settings":
    case "/settings/staff":
    case "/settings/teachers":
      return "nav.settings";
    default:
      return "nav.dashboard";
  }
}
