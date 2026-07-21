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
  | "nav.statements"
  | "nav.attendance"
  | "nav.schedule"
  | "nav.events"
  | "nav.settings"
  | "brand.musicSchool"
  | "settings.title"
  | "settings.subtitleAdmin"
  | "settings.subtitleSelf"
  | "settings.yourAccount"
  | "settings.signedInAs"
  | "settings.staffAccounts"
  | "settings.staffAccountsDescription"
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
  | "common.notAvailable"
  | "common.active"
  | "common.inactive"
  | "common.save"
  | "common.saving"
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
  | "common.id"
  | "common.email"
  | "common.phone"
  | "common.teacher"
  | "common.room"
  | "common.subject"
  | "common.track"
  | "common.type"
  | "common.schedule"
  | "common.duration"
  | "common.student"
  | "common.class"
  | "common.date"
  | "common.time"
  | "common.amount"
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
  | "common.capacity"
  | "common.noTeacherAssigned"
  | "common.inSession"
  | "common.noStudentsEnrolled"
  | "common.enrolled"
  | "common.viewClass"
  | "common.when"
  | "common.notes"
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
  | "common.selectStudent"
  | "common.selectTeacher"
  | "common.selectClass"
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
  | "common.backToStatements"
  | "common.redNamesNoCredits"
  | "common.lessonType"
  | "common.unassigned"
  | "common.activate"
  | "common.deactivate"
  | "common.cannotDeactivateSelf"
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
  | "common.fromRecurring"
  | "common.addIncome"
  | "common.addExpense"
  | "common.saveEntry"
  | "common.addEntry"
  | "common.recurringEntries"
  | "common.deleteRecurringEntry"
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
  | "common.addStaffAccount"
  | "common.addManager"
  | "common.addStatenIslandManager"
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
  | "common.deleteClass"
  | "common.deleteClassConfirm"
  | "common.deleteAddress"
  | "common.deleteAddressConfirm"
  | "common.editDateOfBirth"
  | "common.editClass"
  | "common.editTutor"
  | "common.editAddress"
  | "common.addAddress"
  | "common.assignClasses"
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
  | "common.allTracks"
  | "common.classTracks"
  | "common.noClassesInTrack"
  | "common.tuitionsSubtitle"
  | "common.paymentsSubtitle"
  | "common.purchasesSubtitle"
  | "common.statementsSubtitle"
  | "common.attendanceSubtitle"
  | "common.scheduleSubtitle"
  | "common.eventsSubtitle"
  | "common.attendanceFooter"
  | "common.rescheduleThisOccurrence"
  | "common.rescheduleAllFuture"
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
  | "enum.classTrack.otherDesc";

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.students": "Students",
    "nav.leads": "Leads",
    "nav.classes": "Classes",
    "nav.tutors": "Tutors",
    "nav.tuitions": "Tuitions",
    "nav.payments": "Payments",
    "nav.purchases": "Books & Purchases",
    "nav.statements": "Statements",
    "nav.attendance": "Attendance",
    "nav.schedule": "Schedule",
    "nav.events": "Events",
    "nav.settings": "Settings",
    "brand.musicSchool": "Music School",
    "settings.title": "Settings",
    "settings.subtitleAdmin":
      "Manage admin and manager accounts for Brooklyn and Staten Island.",
    "settings.subtitleSelf": "Manage your account settings.",
    "settings.yourAccount": "Your account",
    "settings.signedInAs": "Signed in as",
    "settings.staffAccounts": "Staff accounts",
    "settings.staffAccountsDescription":
      "Admins and managers who use the admin console.",
    "settings.language": "Language",
    "settings.languageDescription":
      "Choose the language for the admin console. Your choice is saved to your account.",
    "settings.languageSaved": "Language updated.",
    "settings.saveLanguage": "Save language",
    "settings.savingLanguage": "Saving…",
    "common.openSidebar": "Open sidebar",
    "common.closeSidebar": "Close sidebar",
    "common.notAvailable": "—",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.save": "Save",
    "common.saving": "Saving…",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.deleting": "Deleting…",
    "common.signOut": "Sign out",
    "common.status": "status",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.close": "Close",
    "common.back": "Back",
    "common.actions": "Actions",
    "common.name": "Name",
    "common.dateOfBirth": "Date of birth",
    "common.id": "ID",
    "common.email": "Email",
    "common.phone": "Phone",
    "common.teacher": "Teacher",
    "common.room": "Room",
    "common.subject": "Subject",
    "common.track": "Track",
    "common.type": "Type",
    "common.schedule": "Schedule",
    "common.duration": "Duration",
    "common.student": "Student",
    "common.class": "Class",
    "common.date": "Date",
    "common.time": "Time",
    "common.amount": "Amount",
    "common.plan": "Plan",
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
    "common.capacity": "(capacity {count})",
    "common.noTeacherAssigned": "No teacher assigned",
    "common.inSession": "In session",
    "common.noStudentsEnrolled": "No students enrolled",
    "common.enrolled": "{count} enrolled",
    "common.viewClass": "View class →",
    "common.when": "When",
    "common.notes": "Notes",
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
    "common.searchTutorsByName": "Search tutors by name",
    "common.searchClasses": "Search classes…",
    "common.searchStaff": "Search by name, email, or role",
    "common.searchTeachers": "Search or select a teacher",
    "common.selectStudent": "Select a student",
    "common.selectTeacher": "Select a teacher",
    "common.selectClass": "Select a class",
    "common.noStudentsYet": "No students yet.",
    "common.noStudentsFound": "No students found.",
    "common.noTutorsYet": "No tutors yet.",
    "common.noTutorsFound": "No tutors found.",
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
    "common.backToTutors": "← Back to tutors",
    "common.backToStatements": "← All statements",
    "common.redNamesNoCredits": "Red names have no class credits remaining",
    "common.lessonType": "Lesson type",
    "common.unassigned": "Unassigned",
    "common.activate": "Activate",
    "common.deactivate": "Deactivate",
    "common.cannotDeactivateSelf": "You cannot deactivate your own account.",
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
    "common.noVariableExpenses": "No variable expenses this month. Tutor paychecks and one-off costs appear here.",
    "common.fromPayment": "From payment",
    "common.fromPurchase": "From purchase",
    "common.fromPaycheck": "Tutor paycheck",
    "common.fromRecurring": "Recurring",
    "common.addIncome": "Add income",
    "common.addExpense": "Add expense",
    "common.saveEntry": "Save entry",
    "common.addEntry": "Add entry",
    "common.recurringEntries": "Recurring entries",
    "common.deleteRecurringEntry": "Delete recurring entry",
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
    "common.addStaffAccount": "Add staff account",
    "common.addManager": "Add manager",
    "common.addStatenIslandManager": "Add Staten Island manager",
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
    "common.addNewTutor": "Add new tutor",
    "common.addNewClass": "Add new class",
    "common.saveStudent": "Save student",
    "common.saveTutor": "Save tutor",
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
    "common.deleteClass": "Delete class",
    "common.deleteClassConfirm": "This will permanently delete this class and all related records.",
    "common.deleteAddress": "Delete address",
    "common.deleteAddressConfirm": "This will permanently delete this address.",
    "common.editDateOfBirth": "Edit date of birth",
    "common.editClass": "Edit class",
    "common.editTutor": "Edit tutor",
    "common.editAddress": "Edit address",
    "common.addAddress": "Add address",
    "common.assignClasses": "Assign classes",
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
    "common.tutorId": "Tutor ID",
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
    "common.scheduleHelp": "A class can meet multiple times per week. Add each meeting time separately.",
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
    "common.allTracks": "All tracks",
    "common.classTracks": "Class tracks",
    "common.noClassesInTrack": "No {status} classes in this track.",
    "common.tuitionsSubtitle": "Per-class rates and prepaid packages for private and group lessons.",
    "common.paymentsSubtitle": "Record class payments. Completed payments appear in Statements automatically.",
    "common.purchasesSubtitle": "Books, materials, and other student purchases.",
    "common.statementsSubtitle": "Monthly income and expense summaries.",
    "common.attendanceSubtitle": "Mark daily attendance for enrolled students.",
    "common.scheduleSubtitle": "Drag or click to view and reschedule class sessions.",
    "common.eventsSubtitle": "Share school news, photos, and video highlights.",
    "common.attendanceFooter": "Use the student profile to grant make-up credits for excused absences.",
    "common.rescheduleThisOccurrence": "This occurrence only",
    "common.rescheduleAllFuture": "All future occurrences",
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
    "common.searchClassesFull": "Search classes by subject, track, tutor, room, or type",
    "common.searchAndSelectClasses": "Search and select classes",
    "common.searchAndSelectStudents": "Search and select students",
    "common.addNewTutorInline": "Add new tutor",
    "common.noTutorsAddFirst": "No tutors yet. Add one first.",
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
    "enum.paymentStatus.completed": "Completed",
    "enum.paymentStatus.refunded": "Refunded",
    "enum.paymentStatus.exchanged": "Exchanged",
    "enum.paymentPlan.single": "Single class",
    "enum.paymentPlan.package": "{count}-class package",
    "enum.attendance.present": "Present",
    "enum.attendance.late": "Late",
    "enum.attendance.absent": "Absent",
    "enum.attendance.excused": "Excused",
    "enum.attendanceDescription.present": "Attended — 1 credit used",
    "enum.attendanceDescription.late": "Arrived late — 1 credit used",
    "enum.attendanceDescription.absent": "Did not attend",
    "enum.attendanceDescription.excused": "Excused absence — no credit used",
    "enum.staffRole.admin": "Admin",
    "enum.staffRole.manager": "Manager",
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
      "Pick a date to view classes, or optionally filter by student.",
    "common.classesOnDate": "Classes on {date}",
    "common.attendanceAllClassesHelp":
      "All scheduled classes for this date. Mark attendance for each student below.",
    "common.noClassesOnDate": "No classes scheduled for this date.",
    "common.viewStudentClassesOnly":
      "Select a student above to view their classes only.",
    "common.classCountOnDate": "{count} classes on {date}",
    "common.paymentOptionUnavailable":
      "This payment option is not available for this class.",
    "common.noActiveClassesFor": "No active classes for {name}.",
    "common.recordPaymentDialogHelp":
      "Choose the student, teacher, class, and how many classes they are paying for. Income is added to Statements automatically.",
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
      "Assign classes to this tutor before calculating a paycheck.",
    "common.classesThisPeriod": "{count} classes this period",
    "common.recordedAt": "Recorded {date}",
    "common.recordedAsExpenseFor": "Recorded as an expense for {month}.",
    "common.paycheckRatesHelp":
      "Class counts are based on sessions used or marked absent. Pay rates are saved per class and carry over to other months until you change them.",
    "common.subtotal": "Subtotal",
    "common.confirmPaycheckReview":
      "Review the full class list for {month} before recording this expense.",
    "common.paycheckExpenseWillRecord":
      "{count} classes will be recorded as an expense on the {month} statement.",
    "common.statementsAutoMonths":
      "No statements yet. Months appear automatically when payments are recorded.",
    "common.teachers": "Teachers",
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
    "nav.tutors": "导师",
    "nav.tuitions": "学费",
    "nav.payments": "付款",
    "nav.purchases": "书籍与购买",
    "nav.statements": "财务报表",
    "nav.attendance": "考勤",
    "nav.schedule": "日程",
    "nav.events": "活动",
    "nav.settings": "设置",
    "brand.musicSchool": "音乐学校",
    "settings.title": "设置",
    "settings.subtitleAdmin": "管理布鲁克林和史泰登岛的管理员与经理账户。",
    "settings.subtitleSelf": "管理您的账户设置。",
    "settings.yourAccount": "您的账户",
    "settings.signedInAs": "当前登录",
    "settings.staffAccounts": "员工账户",
    "settings.staffAccountsDescription": "使用管理后台的管理员和经理。",
    "settings.language": "语言",
    "settings.languageDescription":
      "选择管理后台的显示语言。您的选择会保存到账户，下次登录仍然有效。",
    "settings.languageSaved": "语言已更新。",
    "settings.saveLanguage": "保存语言",
    "settings.savingLanguage": "保存中…",
    "common.openSidebar": "打开侧边栏",
    "common.closeSidebar": "关闭侧边栏",
    "common.notAvailable": "—",
    "common.active": "活跃",
    "common.inactive": "非活跃",
    "common.save": "保存",
    "common.saving": "保存中…",
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
    "common.id": "编号",
    "common.email": "邮箱",
    "common.phone": "电话",
    "common.teacher": "导师",
    "common.room": "教室",
    "common.subject": "科目",
    "common.track": "类别",
    "common.type": "类型",
    "common.schedule": "日程",
    "common.duration": "时长",
    "common.student": "学生",
    "common.class": "课程",
    "common.date": "日期",
    "common.time": "时间",
    "common.amount": "金额",
    "common.plan": "方案",
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
    "common.capacity": "（容量 {count}）",
    "common.noTeacherAssigned": "未分配导师",
    "common.inSession": "进行中",
    "common.noStudentsEnrolled": "暂无学生报名",
    "common.enrolled": "已报名 {count} 人",
    "common.viewClass": "查看课程 →",
    "common.when": "时间",
    "common.notes": "备注",
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
    "common.searchTutorsByName": "按姓名搜索导师",
    "common.searchClasses": "搜索课程…",
    "common.searchStaff": "按姓名、邮箱或角色搜索",
    "common.searchTeachers": "搜索或选择导师",
    "common.selectStudent": "选择学生",
    "common.selectTeacher": "选择导师",
    "common.selectClass": "选择课程",
    "common.noStudentsYet": "暂无学生。",
    "common.noStudentsFound": "未找到学生。",
    "common.noTutorsYet": "暂无导师。",
    "common.noTutorsFound": "未找到导师。",
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
    "common.backToTutors": "← 返回导师列表",
    "common.backToStatements": "← 全部财务报表",
    "common.redNamesNoCredits": "红色姓名表示课时已用完",
    "common.lessonType": "课程类型",
    "common.unassigned": "未分配",
    "common.activate": "激活",
    "common.deactivate": "停用",
    "common.cannotDeactivateSelf": "您不能停用自己的账户。",
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
    "common.noVariableExpenses": "本月暂无变动支出。导师工资和一次性费用会显示在这里。",
    "common.fromPayment": "来自付款",
    "common.fromPurchase": "来自购买",
    "common.fromPaycheck": "导师工资",
    "common.fromRecurring": "定期",
    "common.addIncome": "添加收入",
    "common.addExpense": "添加支出",
    "common.saveEntry": "保存条目",
    "common.addEntry": "添加条目",
    "common.recurringEntries": "定期条目",
    "common.deleteRecurringEntry": "删除定期条目",
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
    "common.allTeachers": "全部导师",
    "common.previousWeek": "上一周",
    "common.nextWeek": "下一周",
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
    "common.selectTeacherFirst": "请先选择导师。",
    "common.selectClassFirst": "请先选择课程。",
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
    "common.addStaffAccount": "添加员工账户",
    "common.addManager": "添加经理",
    "common.addStatenIslandManager": "添加史泰登岛经理",
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
    "common.addNewTutor": "添加新导师",
    "common.addNewClass": "添加新课程",
    "common.saveStudent": "保存学生",
    "common.saveTutor": "保存导师",
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
    "common.deleteClass": "删除课程",
    "common.deleteClassConfirm": "这将永久删除此课程及所有相关记录。",
    "common.deleteAddress": "删除地址",
    "common.deleteAddressConfirm": "这将永久删除此地址。",
    "common.editDateOfBirth": "编辑出生日期",
    "common.editClass": "编辑课程",
    "common.editTutor": "编辑导师",
    "common.editAddress": "编辑地址",
    "common.addAddress": "添加地址",
    "common.assignClasses": "分配课程",
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
    "common.tutorId": "导师编号",
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
    "common.scheduleHelp": "一门课程可以每周上多次。请分别添加每个上课时间。",
    "common.noMeetingTimes": "暂无上课时间。",
    "common.activeEnrollment": "活跃报名",
    "common.inactiveEnrollment": "非活跃报名",
    "common.toggleActiveStatus": "切换 {name} 的活跃状态",
    "common.quickLinks": "快捷链接",
    "common.todaysOverview": "今日动态，以及学生、导师和课程的快捷入口。",
    "common.happeningNow": "正在进行",
    "common.classesInSession": "当前正在进行的课程",
    "common.noClassesMeetingNow": "目前没有正在进行的课程。",
    "common.comingUpToday": "今日即将开始",
    "common.classesStillScheduled": "今天剩余的课程安排",
    "common.noMoreClassesToday": "今天没有更多课程安排。",
    "common.allTracks": "全部类别",
    "common.classTracks": "课程类别",
    "common.noClassesInTrack": "此类别暂无{status}课程。",
    "common.tuitionsSubtitle": "一对一和小组课程的每节课费率和预付费套餐。",
    "common.paymentsSubtitle": "记录课程付款。已完成的付款会自动出现在财务报表中。",
    "common.purchasesSubtitle": "书籍、材料和其他学生购买。",
    "common.statementsSubtitle": "月度收支汇总。",
    "common.attendanceSubtitle": "为报名学生标记每日考勤。",
    "common.scheduleSubtitle": "拖动或点击以查看和改期课程。",
    "common.eventsSubtitle": "分享学校新闻、照片和视频亮点。",
    "common.attendanceFooter": "使用学生档案为请假缺勤授予补课课时。",
    "common.rescheduleThisOccurrence": "仅此次",
    "common.rescheduleAllFuture": "所有未来课程",
    "common.updateClassTime": "更新上课时间",
    "common.searchClassesPrices": "搜索课程、导师或价格…",
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
    "common.searchClassesFull": "按科目、类别、导师、教室或类型搜索课程",
    "common.searchAndSelectClasses": "搜索并选择课程",
    "common.searchAndSelectStudents": "搜索并选择学生",
    "common.addNewTutorInline": "添加新导师",
    "common.noTutorsAddFirst": "暂无导师，请先添加。",
    "common.noRoomsAvailable": "暂无可用教室。",
    "common.placeholderSubject": "例如：钢琴、声乐、芭蕾",
    "common.placeholderDescription": "描述",
    "common.placeholderPurchase": "例如：钢琴书、节拍器、演出费",
    "common.placeholderEventTitle": "标题（可选）",
    "common.placeholderEventBody": "学校发生了什么？",
    "common.purchaseDescription": "描述",
    "common.confirmPurchaseTitle": "确认购买",
    "common.confirmPaymentTitle": "确定吗？",
    "common.paymentPlanHelp": "为此课程选择付款方案。",
    "common.singleClassLabel": "单节课",
    "common.activeEnrolled": "活跃 · 已报名 {count} 人",
    "common.activeEnrolledSummary": "{active} 活跃 · {enrolled} 已报名",
    "common.studentsEnrolled": "已报名学生",
    "common.noStudentsEnrolledInClass": "此课程暂无学生报名。",
    "common.classPayments": "课程付款",
    "common.studentPurchases": "学生购买",
    "common.teacherPaycheck": "导师工资",
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
    "enum.paymentStatus.completed": "已完成",
    "enum.paymentStatus.refunded": "已退款",
    "enum.paymentStatus.exchanged": "已换课",
    "enum.paymentPlan.single": "单节课",
    "enum.paymentPlan.package": "{count}节课套餐",
    "enum.attendance.present": "出席",
    "enum.attendance.late": "迟到",
    "enum.attendance.absent": "缺席",
    "enum.attendance.excused": "请假",
    "enum.attendanceDescription.present": "已出席 — 扣除1课时",
    "enum.attendanceDescription.late": "迟到 — 扣除1课时",
    "enum.attendanceDescription.absent": "未出席",
    "enum.attendanceDescription.excused": "请假 — 不扣课时",
    "enum.staffRole.admin": "管理员",
    "enum.staffRole.manager": "经理",
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
    "common.attendancePickDateHelp": "选择日期查看课程，也可按学生筛选。",
    "common.classesOnDate": "{date} 的课程",
    "common.attendanceAllClassesHelp":
      "此日期的所有已安排课程。请在下方为每位学生标记考勤。",
    "common.noClassesOnDate": "此日期没有安排课程。",
    "common.viewStudentClassesOnly": "在上方选择学生以仅查看其课程。",
    "common.classCountOnDate": "{date} 共 {count} 节课",
    "common.paymentOptionUnavailable": "此课程不支持该付款选项。",
    "common.noActiveClassesFor": "{name} 暂无活跃课程。",
    "common.recordPaymentDialogHelp":
      "选择学生、导师、课程和付款课时数。收入会自动添加到财务报表。",
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
    "common.assignClassesForPaycheck": "请先为该导师分配课程再计算工资。",
    "common.classesThisPeriod": "本期 {count} 节课",
    "common.recordedAt": "记录于 {date}",
    "common.recordedAsExpenseFor": "已记录为 {month} 的支出。",
    "common.paycheckRatesHelp":
      "课时数基于已使用或标记缺席的课程。每节课费率会保存并在其他月份沿用，直到您更改。",
    "common.subtotal": "小计",
    "common.confirmPaycheckReview":
      "记录前请审核 {month} 的完整课程列表。",
    "common.paycheckExpenseWillRecord":
      "{count} 节课将记录为 {month} 财务报表的支出。",
    "common.statementsAutoMonths":
      "暂无财务报表。记录付款后月份会自动出现。",
    "common.teachers": "导师",
    "common.teacherFilterHelp":
      "选择一个或多个导师。全部不选则显示所有人。",
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
  let text = translations[language][key];
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${param}\\}`, "g"), String(value));
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
      return "nav.payments";
    case "/purchases":
      return "nav.purchases";
    case "/statements":
      return "nav.statements";
    case "/attendance":
      return "nav.attendance";
    case "/schedule":
      return "nav.schedule";
    case "/events":
      return "nav.events";
    case "/settings":
      return "nav.settings";
    default:
      return "nav.dashboard";
  }
}
