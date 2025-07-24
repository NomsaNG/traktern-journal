from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import json
import os
from io import BytesIO
import markdown
import pdfkit
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///traktern.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
db = SQLAlchemy(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Models
class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    worked_on = db.Column(db.Text, nullable=False)
    learned = db.Column(db.Text, nullable=False)
    challenges = db.Column(db.Text, nullable=False)
    goals = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'worked_on': self.worked_on,
            'learned': self.learned,
            'challenges': self.challenges,
            'goals': self.goals,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Skill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    level = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    progress_updates = db.relationship('SkillProgress', backref='skill', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'level': self.level,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'progress': [update.to_dict() for update in self.progress_updates]
        }

class SkillProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    skill_id = db.Column(db.Integer, db.ForeignKey('skill.id'), nullable=False)
    date = db.Column(db.Date, default=datetime.utcnow().date)
    note = db.Column(db.Text, nullable=False)
    level = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'note': self.note,
            'level': self.level,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255))
    link = db.Column(db.String(255))
    skills_used = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'image_path': self.image_path,
            'link': self.link,
            'skills_used': self.skills_used,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/skills')
def skills():
    return render_template('skills.html')

@app.route('/summary')
def summary():
    return render_template('summary.html')

@app.route('/export')
def export():
    return render_template('export.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

# API Routes
@app.route('/api/journal', methods=['GET'])
def get_journal_entries():
    limit = request.args.get('limit', type=int)
    entries = JournalEntry.query.order_by(JournalEntry.date.desc())
    
    if limit:
        entries = entries.limit(limit)
    
    return jsonify([entry.to_dict() for entry in entries])

@app.route('/api/journal', methods=['POST'])
def add_journal_entry():
    data = request.form
    
    entry = JournalEntry(
        date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
        worked_on=data['worked_on'],
        learned=data['learned'],
        challenges=data['challenges'],
        goals=data['goals']
    )
    
    db.session.add(entry)
    db.session.commit()
    
    return jsonify(entry.to_dict()), 201

@app.route('/api/skills', methods=['GET'])
def get_skills():
    skills = Skill.query.all()
    return jsonify([skill.to_dict() for skill in skills])

@app.route('/api/skills', methods=['POST'])
def add_skill():
    data = request.form
    
    skill = Skill(
        name=data['skill_name'],
        description=data['skill_description'],
        level=int(data['skill_level'])
    )
    
    db.session.add(skill)
    db.session.commit()
    
    return jsonify(skill.to_dict()), 201

@app.route('/api/skills/progress', methods=['POST'])
def update_skill_progress():
    data = request.form
    
    skill_id = int(data['skill_id'])
    skill = Skill.query.get_or_404(skill_id)
    
    progress = SkillProgress(
        skill_id=skill_id,
        note=data['progress_note'],
        level=int(data['new_level'])
    )
    
    # Update the skill's level
    skill.level = int(data['new_level'])
    
    db.session.add(progress)
    db.session.commit()
    
    return jsonify(skill.to_dict()), 201

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = Project.query.order_by(Project.created_at.desc()).all()
    return jsonify([project.to_dict() for project in projects])

@app.route('/api/projects', methods=['POST'])
def add_project():
    # Handle image upload
    image_path = None
    if 'project_image' in request.files:
        file = request.files['project_image']
        if file and file.filename:
            filename = secure_filename(file.filename)
            # Add timestamp to filename to avoid duplicates
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            filename = f"{timestamp}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            image_path = f"/static/uploads/{filename}"
    
    # Create new project
    project = Project(
        title=request.form['title'],
        description=request.form['description'],
        image_path=image_path,
        link=request.form['link'],
        skills_used=request.form['skills_used']
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify(project.to_dict()), 201

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    
    # Delete the project image if it exists
    if project.image_path:
        try:
            file_path = os.path.join(app.root_path, project.image_path.lstrip('/'))
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting image: {e}")
    
    db.session.delete(project)
    db.session.commit()
    
    return jsonify({"message": "Project deleted successfully"}), 200

@app.route('/api/summary/weekly', methods=['GET'])
def get_weekly_summary():
    # Get the current date and calculate the start of the week (Monday)
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    # Get journal entries for the current week
    entries = JournalEntry.query.filter(
        JournalEntry.date >= start_of_week,
        JournalEntry.date <= end_of_week
    ).all()
    
    if not entries:
        return jsonify(None)
    
    # Extract data for the summary
    accomplishments = []
    learnings = []
    challenges = []
    goals = []
    
    for entry in entries:
        if entry.worked_on:
            accomplishments.append(entry.worked_on)
        if entry.learned:
            learnings.append(entry.learned)
        if entry.challenges:
            challenges.append(entry.challenges)
        if entry.goals:
            goals.append(entry.goals)
    
    summary = {
        'startDate': start_of_week.strftime('%b %d, %Y'),
        'endDate': end_of_week.strftime('%b %d, %Y'),
        'accomplishments': accomplishments,
        'learnings': learnings,
        'challenges': challenges,
        'goals': goals
    }
    
    return jsonify(summary)

@app.route('/api/export/journal', methods=['POST'])
def export_journal():
    data = request.json
    format_type = data.get('format', 'pdf')
    date_range = data.get('dateRange', 'week')
    
    # Get the appropriate date range
    today = datetime.utcnow().date()
    if date_range == 'week':
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif date_range == 'month':
        start_date = today.replace(day=1)
        # Get the last day of the month
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif date_range == '3months':
        # 3 months ago
        if today.month <= 3:
            start_date = today.replace(year=today.year - 1, month=today.month + 9, day=1)
        else:
            start_date = today.replace(month=today.month - 3, day=1)
        end_date = today
    else:  # all
        # Get the earliest entry
        earliest_entry = JournalEntry.query.order_by(JournalEntry.date.asc()).first()
        if earliest_entry:
            start_date = earliest_entry.date
        else:
            start_date = today
        end_date = today
    
    # Get journal entries for the selected date range
    entries = JournalEntry.query.filter(
        JournalEntry.date >= start_date,
        JournalEntry.date <= end_date
    ).order_by(JournalEntry.date.desc()).all()
    
    if not entries:
        return jsonify({'error': 'No entries found for the selected date range'}), 404
    
    # Generate content based on format
    if format_type == 'markdown':
        content = "# Journal Entries\n\n"
        for entry in entries:
            content += f"## {entry.date.strftime('%B %d, %Y')}\n\n"
            content += f"### What I worked on\n{entry.worked_on}\n\n"
            content += f"### What I learned\n{entry.learned}\n\n"
            content += f"### Challenges\n{entry.challenges}\n\n"
            content += f"### Goals for tomorrow\n{entry.goals}\n\n"
            content += "---\n\n"
        
        # Create a BytesIO object to store the markdown content
        buffer = BytesIO(content.encode('utf-8'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"journal_entries_{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}.md",
            mimetype='text/markdown'
        )
    else:  # PDF
        # Generate HTML content
        html_content = "<h1>Journal Entries</h1>"
        for entry in entries:
            html_content += f"<h2>{entry.date.strftime('%B %d, %Y')}</h2>"
            html_content += f"<h3>What I worked on</h3><p>{entry.worked_on}</p>"
            html_content += f"<h3>What I learned</h3><p>{entry.learned}</p>"
            html_content += f"<h3>Challenges</h3><p>{entry.challenges}</p>"
            html_content += f"<h3>Goals for tomorrow</h3><p>{entry.goals}</p>"
            html_content += "<hr>"
        
        # Convert HTML to PDF
        pdf = pdfkit.from_string(html_content, False)
        
        # Create a BytesIO object to store the PDF
        buffer = BytesIO(pdf)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"journal_entries_{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}.pdf",
            mimetype='application/pdf'
        )

@app.route('/api/export/skills', methods=['POST'])
def export_skills():
    data = request.json
    format_type = data.get('format', 'pdf')
    
    # Get all skills with their progress updates
    skills = Skill.query.all()
    
    if not skills:
        return jsonify({'error': 'No skills found'}), 404
    
    # Generate content based on format
    if format_type == 'markdown':
        content = "# Skills Progress\n\n"
        for skill in skills:
            content += f"## {skill.name} (Level {skill.level}/5)\n\n"
            if skill.description:
                content += f"{skill.description}\n\n"
            
            if skill.progress_updates:
                content += "### Progress Updates\n\n"
                for update in sorted(skill.progress_updates, key=lambda x: x.date, reverse=True):
                    content += f"- **{update.date.strftime('%B %d, %Y')}**: {update.note} (Level: {update.level}/5)\n"
            
            content += "\n---\n\n"
        
        # Create a BytesIO object to store the markdown content
        buffer = BytesIO(content.encode('utf-8'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"skills_progress_{datetime.utcnow().strftime('%Y%m%d')}.md",
            mimetype='text/markdown'
        )
    else:  # PDF
        # Generate HTML content
        html_content = "<h1>Skills Progress</h1>"
        for skill in skills:
            html_content += f"<h2>{skill.name} (Level {skill.level}/5)</h2>"
            if skill.description:
                html_content += f"<p>{skill.description}</p>"
            
            if skill.progress_updates:
                html_content += "<h3>Progress Updates</h3><ul>"
                for update in sorted(skill.progress_updates, key=lambda x: x.date, reverse=True):
                    html_content += f"<li><strong>{update.date.strftime('%B %d, %Y')}</strong>: {update.note} (Level: {update.level}/5)</li>"
                html_content += "</ul>"
            
            html_content += "<hr>"
        
        # Convert HTML to PDF
        pdf = pdfkit.from_string(html_content, False)
        
        # Create a BytesIO object to store the PDF
        buffer = BytesIO(pdf)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"skills_progress_{datetime.utcnow().strftime('%Y%m%d')}.pdf",
            mimetype='application/pdf'
        )

@app.route('/api/chart/skills', methods=['GET'])
def get_skill_chart_data():
    # Get all skills with their progress updates
    skills = Skill.query.all()
    
    if not skills:
        return jsonify([])
    
    # Get all unique dates from progress updates
    all_dates = set()
    for skill in skills:
        for update in skill.progress_updates:
            all_dates.add(update.date)
    
    # Sort dates
    sorted_dates = sorted(all_dates)
    
    # If no progress updates, use skill creation dates
    if not sorted_dates:
        for skill in skills:
            all_dates.add(skill.created_at.date())
        sorted_dates = sorted(all_dates)
    
    # Create chart data
    chart_data = []
    for date in sorted_dates:
        data_point = {'date': date.strftime('%Y-%m-%d')}
        
        for skill in skills:
            # Find the level at this date
            level = 1  # Default level
            
            # Check if there's a progress update on or before this date
            updates_before = [u for u in skill.progress_updates if u.date <= date]
            if updates_before:
                # Get the most recent update
                latest_update = max(updates_before, key=lambda u: u.date)
                level = latest_update.level
            else:
                # If no updates, use the initial level if the skill was created before this date
                if skill.created_at.date() <= date:
                    level = skill.level
                else:
                    # Skill wasn't created yet
                    continue
            
            data_point[skill.name] = level
        
        chart_data.append(data_point)
    
    return jsonify(chart_data)

@app.route('/api/chart/productivity', methods=['GET'])
def get_productivity_chart_data():
    # Get all journal entries grouped by week
    today = datetime.utcnow().date()
    
    # Get entries from the last 8 weeks
    start_date = today - timedelta(weeks=8)
    
    entries = JournalEntry.query.filter(JournalEntry.date >= start_date).all()
    
    if not entries:
        return jsonify([])
    
    # Group entries by week
    weeks = {}
    for entry in entries:
        # Calculate the start of the week (Monday)
        week_start = entry.date - timedelta(days=entry.date.weekday())
        week_key = week_start.strftime('%Y-%m-%d')
        
        if week_key not in weeks:
            weeks[week_key] = {
                'week': f"Week of {week_start.strftime('%b %d')}",
                'entries': 0
            }
        
        weeks[week_key]['entries'] += 1
    
    # Convert to list and sort by week
    chart_data = list(weeks.values())
    chart_data.sort(key=lambda x: x['week'])
    
    return jsonify(chart_data)

# Initialize the database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
