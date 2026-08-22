from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, func
from db import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    role = Column(Text, nullable=False)  # 'employee' | 'admin' | 'technician'
    department = Column(Text)


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text, nullable=False)
    priority = Column(Text, nullable=False, default="Medium")
    status = Column(Text, nullable=False, default="Pending")
    sla_minutes = Column(Integer, nullable=False)
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now())


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    from_status = Column(Text, nullable=False)
    to_status = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    escalated_to = Column(Text)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
