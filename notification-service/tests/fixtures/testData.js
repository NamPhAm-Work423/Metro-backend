/**
 * Test data fixtures for passenger tracing functionality
 */

// Mock fareBreakdown data matching real structure
const mockFareBreakdown = {
    journeyDetails: {
        isDirectJourney: false,
        totalRoutes: 2,
        totalStations: 6,
        routeSegments: [
            {
                routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
                routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên',
                originStationId: 'van-thanh',
                destinationStationId: 'ben-thanh',
                stationCount: 4
            },
            {
                routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
                routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái',
                originStationId: 'ben-thanh',
                destinationStationId: 'tao-dan',
                stationCount: 2
            }
        ],
        connectionPoints: ['ben-thanh']
    },
    segmentFares: [
        {
            routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
            routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên',
            originStationId: 'van-thanh',
            destinationStationId: 'ben-thanh',
            stationCount: 4,
            basePrice: 10000,
            tripPrice: 15000,
            fareDetails: {
                fareId: '9e54155a-cd1e-4b73-af6e-f416d66c2597',
                basePrice: '10000.00',
                currency: 'VND'
            }
        },
        {
            routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
            routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái',
            originStationId: 'ben-thanh',
            destinationStationId: 'tao-dan',
            stationCount: 2,
            basePrice: 10000,
            tripPrice: 15000,
            fareDetails: {
                fareId: 'd95d9233-59ad-436e-95b7-cc91a9f85812',
                basePrice: '10000.00',
                currency: 'VND'
            }
        }
    ],
    passengerBreakdown: [
        {
            type: 'adult',
            count: 1,
            pricePerPerson: 30000,
            subtotal: 30000
        }
    ],
    totalPassengers: 1
};

// Mock tickets data
const mockTickets = [
    {
        ticketId: 'ticket-001',
        passengerId: 'passenger-001',
        status: 'active',
        ticketType: 'short-term',
        fareBreakdown: {
            ...mockFareBreakdown,
            journeyDetails: {
                ...mockFareBreakdown.journeyDetails,
                routeSegments: [
                    {
                        routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
                        routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên',
                        originStationId: 'van-thanh',
                        destinationStationId: 'ben-thanh',
                        stationCount: 4
                    }
                ]
            }
        },
        createdAt: new Date('2024-01-01T08:00:00Z'),
        updatedAt: new Date('2024-01-01T08:00:00Z')
    },
    {
        ticketId: 'ticket-002',
        passengerId: 'passenger-002',
        status: 'inactive',
        ticketType: 'long-term',
        fareBreakdown: {
            ...mockFareBreakdown,
            segmentFares: [
                {
                    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
                    routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái',
                    originStationId: 'ben-thanh',
                    destinationStationId: 'tao-dan',
                    stationCount: 2,
                    basePrice: 10000,
                    tripPrice: 15000,
                    fareDetails: {
                        fareId: 'd95d9233-59ad-436e-95b7-cc91a9f85812',
                        basePrice: '10000.00',
                        currency: 'VND'
                    }
                }
            ]
        },
        createdAt: new Date('2024-01-02T09:00:00Z'),
        updatedAt: new Date('2024-01-02T09:00:00Z')
    },
    {
        ticketId: 'ticket-003',
        passengerId: 'passenger-001', // Duplicate passenger
        status: 'active',
        ticketType: 'short-term',
        fareBreakdown: {
            journeyDetails: {
                routeSegments: [
                    {
                        routeId: 'tuyen-metro-so-3-bx-mien-tay-bx-mien-dong',
                        routeName: 'Tuyến Metro Số 3: BX Miền Tây - BX Miền Đông',
                        originStationId: 'bx-mien-tay',
                        destinationStationId: 'bx-mien-dong',
                        stationCount: 5
                    }
                ]
            }
        },
        createdAt: new Date('2024-01-03T10:00:00Z'),
        updatedAt: new Date('2024-01-03T10:00:00Z')
    }
];

// Mock passenger contacts data
const mockPassengerContacts = [
    {
        passengerId: 'passenger-001',
        phoneNumber: '+84901234567',
        smsEnabled: true,
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@example.com'
    },
    {
        passengerId: 'passenger-002',
        phoneNumber: '+84907654321',
        smsEnabled: true,
        name: 'Trần Thị Bình',
        email: 'binh.tran@example.com'
    },
    {
        passengerId: 'passenger-003',
        phoneNumber: '+84905555555',
        smsEnabled: false, // SMS disabled
        name: 'Lê Văn Cường',
        email: 'cuong.le@example.com'
    },
    {
        passengerId: 'passenger-004',
        phoneNumber: '+84908888888',
        smsEnabled: true,
        name: 'Phạm Thị Dung',
        email: 'dung.pham@example.com'
    }
];

// Mock station deactivation event data
const mockStationDeactivationEvent = {
    type: 'STATION_DEACTIVATED',
    version: '1.0',
    timestamp: '2024-01-15T14:30:00Z',
    data: {
        stationId: 'ben-thanh',
        stationName: 'Ga Bến Thành',
        location: 'Quận 1, TP.HCM',
        reason: 'Bảo trì hệ thống',
        updatedBy: 'admin-001',
        deactivatedAt: '2024-01-15T14:30:00Z',
        affectedRoutes: [
            {
                routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
                routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên',
                sequence: 1,
                originId: 'ben-thanh',
                destinationId: 'suoi-tien'
            },
            {
                routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
                routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái',
                sequence: 1,
                originId: 'ben-thanh',
                destinationId: 'cat-lai'
            }
        ],
        metadata: {
            service: 'transport-service',
            eventId: 'station-deactivated-ben-thanh-1705327800000',
            requiresNotification: true
        }
    }
};

// Mock route data for testing
const mockRoutes = [
    {
        routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
        routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên',
        originId: 'ben-thanh',
        destinationId: 'suoi-tien',
        isActive: true
    },
    {
        routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
        routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái',
        originId: 'bx-an-suong',
        destinationId: 'cat-lai',
        isActive: true
    },
    {
        routeId: 'tuyen-metro-so-3-bx-mien-tay-bx-mien-dong',
        routeName: 'Tuyến Metro Số 3: BX Miền Tây - BX Miền Đông',
        originId: 'bx-mien-tay',
        destinationId: 'bx-mien-dong',
        isActive: true
    }
];

// Mock SMS template data
const mockSmsTemplateData = {
    stationName: 'Ga Bến Thành',
    location: 'Quận 1, TP.HCM',
    reason: 'Bảo trì hệ thống',
    affectedRoutes: [
        {
            routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
            routeName: 'Tuyến Metro Số 1: Bến Thành - Suối Tiên'
        },
        {
            routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
            routeName: 'Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái'
        }
    ]
};

// Mock rendered SMS content
const mockRenderedSms = `🚨 THÔNG BÁO TẠM NGỪNG GA

Ga: Ga Bến Thành
Địa điểm: Quận 1, TP.HCM
Lý do: Bảo trì hệ thống

Các tuyến bị ảnh hưởng:
• Tuyến Metro Số 1: Bến Thành - Suối Tiên (Tuyến tuyen-metro-so-1-ben-thanh-suoi-tien)
• Tuyến Metro Số 2: BX An Sương - Mỹ Cát Lái (Tuyến tuyen-metro-so-2-bx-an-suong-moi-cat-lai)

Vui lòng sử dụng ga khác để tiếp tục hành trình.
Cảm ơn bạn đã thông cảm!

---
Metro System`;

// Mock gRPC responses
const mockGrpcResponses = {
    ticketsByRoutes: {
        tickets: mockTickets,
        totalCount: mockTickets.length
    },
    passengerIdsByRoutes: {
        passengerIds: ['passenger-001', 'passenger-002'],
        totalCount: 2,
        traces: [
            {
                ticketId: 'ticket-001',
                passengerId: 'passenger-001',
                matchedRoutes: ['tuyen-metro-so-1-ben-thanh-suoi-tien']
            },
            {
                ticketId: 'ticket-002',
                passengerId: 'passenger-002',
                matchedRoutes: ['tuyen-metro-so-2-bx-an-suong-moi-cat-lai']
            }
        ]
    },
    passengerContacts: {
        contacts: mockPassengerContacts
    },
    passengerEmails: {
        passengers: [
            {
                passengerId: 'passenger-001',
                email: 'nguyen@example.com',
                name: 'Nguyễn Văn An',
                emailEnabled: true
            },
            {
                passengerId: 'passenger-002',
                email: 'tran@example.com',
                name: 'Trần Thị Bình',
                emailEnabled: true
            }
        ]
    }
};

// Test scenarios
const testScenarios = {
    // Scenario 1: Normal flow with matching tickets
    normalFlow: {
        routeIds: ['tuyen-metro-so-1-ben-thanh-suoi-tien', 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai'],
        statuses: ['active', 'inactive'],
        expectedPassengerIds: ['passenger-001', 'passenger-002'],
        expectedEmailEnabledUsers: 2
    },
    
    // Scenario 2: No matching tickets
    noMatchingTickets: {
        routeIds: ['non-existent-route'],
        statuses: ['active'],
        expectedPassengerIds: [],
        expectedEmailEnabledUsers: 0
    },
    
    // Scenario 3: Mixed email preferences
    mixedEmailPreferences: {
        routeIds: ['tuyen-metro-so-1-ben-thanh-suoi-tien'],
        statuses: ['active'],
        expectedPassengerIds: ['passenger-001'],
        expectedEmailEnabledUsers: 1 // Only passenger-001 has email enabled
    },
    
    // Scenario 4: Duplicate passenger IDs
    duplicatePassengerIds: {
        routeIds: ['tuyen-metro-so-1-ben-thanh-suoi-tien', 'tuyen-metro-so-3-bx-mien-tay-bx-mien-dong'],
        statuses: ['active'],
        expectedPassengerIds: ['passenger-001'], // Should be unique
        expectedEmailEnabledUsers: 1
    }
};

module.exports = {
    mockFareBreakdown,
    mockTickets,
    mockPassengerContacts,
    mockStationDeactivationEvent,
    mockRoutes,
    mockSmsTemplateData,
    mockRenderedSms,
    mockGrpcResponses,
    testScenarios
};
