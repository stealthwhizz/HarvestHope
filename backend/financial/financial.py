"""
Financial Service Lambda Function for Harvest Hope
Handles loan processing, EMI calculations, and government scheme integration
"""

import json
import boto3
import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
import uuid

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

class FinancialService:
    """Core financial service for loan and scheme management"""
    
    def __init__(self):
        self.loans_table = dynamodb.Table('HarvestHope-Loans')
        self.schemes_table = dynamodb.Table('HarvestHope-GovernmentSchemes')
        self.transactions_table = dynamodb.Table('HarvestHope-Transactions')
    
    def calculate_emi(self, principal: float, annual_rate: float, duration_months: int) -> Dict[str, Any]:
        """
        Calculate EMI using standard formula: P * r * (1+r)^n / ((1+r)^n - 1)
        Returns EMI amount and complete schedule
        """
        try:
            if principal <= 0 or annual_rate < 0 or duration_months <= 0:
                raise ValueError("Invalid loan parameters")
            
            # Handle zero interest case (some government schemes)
            if annual_rate == 0:
                emi_amount = principal / duration_months
                total_amount = principal
                total_interest = 0
            else:
                monthly_rate = annual_rate / (12 * 100)
                numerator = principal * monthly_rate * ((1 + monthly_rate) ** duration_months)
                denominator = ((1 + monthly_rate) ** duration_months) - 1
                emi_amount = numerator / denominator
                total_amount = emi_amount * duration_months
                total_interest = total_amount - principal
            
            # Generate EMI schedule
            schedule = self._generate_emi_schedule(principal, annual_rate, duration_months, emi_amount)
            
            return {
                'emi_amount': round(emi_amount, 2),
                'total_amount': round(total_amount, 2),
                'total_interest': round(total_interest, 2),
                'schedule': schedule
            }
            
        except Exception as e:
            logger.error(f"EMI calculation error: {str(e)}")
            raise
    
    def _generate_emi_schedule(self, principal: float, annual_rate: float, duration_months: int, emi_amount: float) -> List[Dict]:
        """Generate detailed EMI schedule with principal and interest breakdown"""
        schedule = []
        remaining_balance = principal
        monthly_rate = annual_rate / (12 * 100) if annual_rate > 0 else 0
        
        for month in range(1, duration_months + 1):
            interest_component = remaining_balance * monthly_rate
            principal_component = emi_amount - interest_component
            remaining_balance = max(0, remaining_balance - principal_component)
            
            schedule.append({
                'month': month,
                'emi_amount': round(emi_amount, 2),
                'principal_component': round(principal_component, 2),
                'interest_component': round(interest_component, 2),
                'remaining_balance': round(remaining_balance, 2)
            })
        
        return schedule
    
    def get_loan_offers(self, credit_score: int, has_collateral: bool, land_area: float) -> List[Dict]:
        """Get available loan offers based on farmer profile"""
        offers = []
        
        # Bank KCC Loan (Kisan Credit Card)
        if credit_score >= 650:
            max_amount = 500000 if has_collateral else 200000
            offers.append({
                'type': 'bank',
                'name': 'Kisan Credit Card (KCC)',
                'max_amount': max_amount,
                'interest_rate': 7.0,  # Subsidized agricultural rate
                'max_duration_months': 60,
                'requirements': [
                    'Valid land documents',
                    'Aadhaar card',
                    'Bank account',
                    f'Credit score >= 650 (Current: {credit_score})'
                ],
                'processing_time_days': 7,
                'collateral_required': True,
                'features': [
                    'Interest subvention available',
                    'Flexible repayment',
                    'Crop insurance linkage'
                ]
            })
        
        # Moneylender (always available but expensive)
        offers.append({
            'type': 'moneylender',
            'name': 'Local Moneylender',
            'max_amount': 100000,
            'interest_rate': 36.0,  # High interest rate
            'max_duration_months': 12,
            'requirements': [
                'Local reference',
                'Identity proof'
            ],
            'processing_time_days': 1,
            'collateral_required': False,
            'features': [
                'Instant approval',
                'No paperwork',
                'High interest rate'
            ]
        })
        
        # Government schemes (if eligible)
        if credit_score >= 600 and land_area <= 2.0:  # Small/marginal farmers
            offers.append({
                'type': 'government',
                'name': 'PM-KISAN Credit Scheme',
                'max_amount': 300000,
                'interest_rate': 4.0,  # Highly subsidized
                'max_duration_months': 84,
                'requirements': [
                    'Small/marginal farmer certificate',
                    'Land ownership proof',
                    'Income certificate',
                    f'Land area <= 2 hectares (Current: {land_area})'
                ],
                'processing_time_days': 14,
                'collateral_required': False,
                'features': [
                    'Government guarantee',
                    'Interest subsidy',
                    'Flexible repayment'
                ]
            })
        
        return offers
    
    def get_government_schemes(self, land_area: float, annual_income: float, has_insurance: bool) -> List[Dict]:
        """Get available government schemes based on farmer profile"""
        schemes = []
        
        # PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)
        if land_area <= 2.0:  # Small and marginal farmers
            schemes.append({
                'id': 'pm-kisan',
                'name': 'PM-KISAN',
                'description': 'Direct income support of ₹6000 per year to small and marginal farmers',
                'benefit_amount': 6000,
                'benefit_type': 'direct_payment',
                'payment_schedule': '₹2000 every 4 months',
                'eligibility_requirements': [
                    'Land holding up to 2 hectares',
                    'Valid Aadhaar card',
                    'Bank account linked to Aadhaar',
                    'Cultivable land ownership'
                ],
                'application_process': [
                    'Visit PM-KISAN portal or CSC',
                    'Fill application form with land details',
                    'Upload Aadhaar, bank passbook, land documents',
                    'Submit for verification by local officials'
                ],
                'is_active': True,
                'processing_time_days': 30
            })
        
        # Pradhan Mantri Fasal Bima Yojana (Crop Insurance)
        if not has_insurance:
            schemes.append({
                'id': 'pmfby',
                'name': 'Pradhan Mantri Fasal Bima Yojana',
                'description': 'Comprehensive crop insurance covering yield losses due to natural calamities',
                'benefit_amount': 0,  # Variable based on crop value
                'benefit_type': 'insurance',
                'premium_rates': {
                    'kharif': '2% of sum insured',
                    'rabi': '1.5% of sum insured',
                    'commercial_horticulture': '5% of sum insured'
                },
                'eligibility_requirements': [
                    'Farmer with insurable interest in crop',
                    'Valid land documents',
                    'Crop details and area information'
                ],
                'application_process': [
                    'Apply through bank, CSC, or insurance company',
                    'Pay farmer premium share',
                    'Submit land and crop details',
                    'Get policy document and coverage details'
                ],
                'is_active': True,
                'processing_time_days': 7
            })
        
        # Interest Subvention Scheme
        schemes.append({
            'id': 'interest-subvention',
            'name': 'Interest Subvention Scheme',
            'description': 'Interest subsidy on crop loans up to ₹3 lakh at 7% interest rate',
            'benefit_amount': 0,  # Percentage of interest
            'benefit_type': 'subsidy',
            'subsidy_rate': '3% interest subvention (effective 4% interest)',
            'eligibility_requirements': [
                'Crop loan from scheduled commercial bank',
                'Loan amount up to ₹3 lakh',
                'Timely repayment within due date',
                'Valid KCC or crop loan account'
            ],
            'application_process': [
                'Apply for crop loan through bank',
                'Ensure timely repayment',
                'Subsidy credited automatically by bank',
                'Additional 3% for prompt repayment'
            ],
            'is_active': True,
            'processing_time_days': 0  # Automatic
        })
        
        # Soil Health Card Scheme
        schemes.append({
            'id': 'soil-health-card',
            'name': 'Soil Health Card Scheme',
            'description': 'Free soil testing and nutrient recommendations for optimal crop yield',
            'benefit_amount': 0,
            'benefit_type': 'service',
            'service_value': 'Free soil testing worth ₹500-1000',
            'eligibility_requirements': [
                'Any farmer with cultivable land',
                'Valid land documents',
                'Aadhaar card'
            ],
            'application_process': [
                'Contact local agriculture extension officer',
                'Provide soil samples as per guidelines',
                'Receive soil health card with recommendations',
                'Follow nutrient management advice'
            ],
            'is_active': True,
            'processing_time_days': 15
        })
        
        return schemes
    
    def calculate_penalty(self, emi_amount: float, days_overdue: int, loan_type: str) -> float:
        """Calculate penalty for missed EMI payments"""
        penalty_rates = {
            'bank': 0.02,  # 2% per month
            'moneylender': 0.05,  # 5% per month
            'government': 0.01  # 1% per month
        }
        
        monthly_penalty_rate = penalty_rates.get(loan_type, 0.02)
        daily_penalty_rate = monthly_penalty_rate / 30
        
        penalty = emi_amount * daily_penalty_rate * days_overdue
        return round(penalty, 2)
    
    def update_credit_score(self, current_score: int, payment_status: str, days_late: int = 0) -> int:
        """Update credit score based on payment history"""
        score_changes = {
            'on_time': 2,
            'late': -5 if days_late <= 30 else -15,
            'missed': -25
        }
        
        score_change = score_changes.get(payment_status, 0)
        new_score = max(300, min(850, current_score + score_change))
        
        return new_score
    
    def process_scheme_application(self, scheme_id: str, farmer_data: Dict) -> Dict:
        """Process government scheme application with eligibility checks"""
        try:
            # Simplified eligibility logic - in production, this would be more complex
            land_area = farmer_data.get('land_area', 0)
            annual_income = farmer_data.get('annual_income', 0)
            
            # Basic eligibility checks
            if scheme_id == 'pm-kisan':
                if land_area > 2.0:
                    return {
                        'approved': False,
                        'reason': 'Land holding exceeds 2 hectares limit for PM-KISAN',
                        'processing_time_days': 0
                    }
            
            # Random approval simulation (80% approval rate)
            import random
            approval_chance = random.random()
            
            if approval_chance > 0.8:
                return {
                    'approved': False,
                    'reason': 'Incomplete documentation or verification pending',
                    'processing_time_days': 7
                }
            
            processing_times = {
                'pm-kisan': 30,
                'pmfby': 7,
                'interest-subvention': 0,
                'soil-health-card': 15
            }
            
            return {
                'approved': True,
                'reason': 'Application approved successfully',
                'processing_time_days': processing_times.get(scheme_id, 14)
            }
            
        except Exception as e:
            logger.error(f"Scheme application processing error: {str(e)}")
            return {
                'approved': False,
                'reason': 'System error during processing',
                'processing_time_days': 0
            }

def lambda_handler(event, context):
    """Main Lambda handler for financial operations"""
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        financial_service = FinancialService()
        
        # Parse the request
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        operation = body.get('operation')
        
        if operation == 'calculate_emi':
            principal = body.get('principal')
            annual_rate = body.get('annual_rate')
            duration_months = body.get('duration_months')
            
            result = financial_service.calculate_emi(principal, annual_rate, duration_months)
            
        elif operation == 'get_loan_offers':
            credit_score = body.get('credit_score')
            has_collateral = body.get('has_collateral', False)
            land_area = body.get('land_area', 0)
            
            result = financial_service.get_loan_offers(credit_score, has_collateral, land_area)
            
        elif operation == 'get_government_schemes':
            land_area = body.get('land_area')
            annual_income = body.get('annual_income')
            has_insurance = body.get('has_insurance', False)
            
            result = financial_service.get_government_schemes(land_area, annual_income, has_insurance)
            
        elif operation == 'calculate_penalty':
            emi_amount = body.get('emi_amount')
            days_overdue = body.get('days_overdue')
            loan_type = body.get('loan_type')
            
            result = financial_service.calculate_penalty(emi_amount, days_overdue, loan_type)
            
        elif operation == 'update_credit_score':
            current_score = body.get('current_score')
            payment_status = body.get('payment_status')
            days_late = body.get('days_late', 0)
            
            result = financial_service.update_credit_score(current_score, payment_status, days_late)
            
        elif operation == 'process_scheme_application':
            scheme_id = body.get('scheme_id')
            farmer_data = body.get('farmer_data', {})
            
            result = financial_service.process_scheme_application(scheme_id, farmer_data)
            
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Unknown operation: {operation}'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'data': result
            })
        }
        
    except Exception as e:
        logger.error(f"Lambda execution error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'success': False
            })
        }